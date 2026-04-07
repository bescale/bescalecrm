-- ============================================================
-- Migration: Lead scoring automático + override manual
-- ============================================================

-- 1) Coluna de override manual (quando NOT NULL, prevalece sobre o cálculo)
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS score_override INTEGER DEFAULT NULL;

-- 2) Função que calcula o score automaticamente baseado em atividade real
CREATE OR REPLACE FUNCTION public.calculate_contact_score(_contact_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _score integer := 0;
  _contact record;
  _conv_count integer;
  _active_conv_count integer;
  _has_opportunity boolean;
  _tag_count integer;
  _recent_message boolean;
BEGIN
  -- Busca dados do contato
  SELECT * INTO _contact
  FROM public.contacts
  WHERE id = _contact_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- +10 se tem telefone
  IF _contact.phone IS NOT NULL AND _contact.phone <> '' THEN
    _score := _score + 10;
  END IF;

  -- +10 se tem email
  IF _contact.email IS NOT NULL AND _contact.email <> '' THEN
    _score := _score + 10;
  END IF;

  -- +5 se tem nome de empresa
  IF _contact.company_name IS NOT NULL AND _contact.company_name <> '' THEN
    _score := _score + 5;
  END IF;

  -- +5 por conversa (máximo +15, ou seja até 3 conversas)
  SELECT COUNT(*) INTO _conv_count
  FROM public.conversations
  WHERE contact_id = _contact_id;

  _score := _score + LEAST(_conv_count * 5, 15);

  -- +15 se tem pelo menos uma conversa ativa (não closed)
  SELECT COUNT(*) INTO _active_conv_count
  FROM public.conversations
  WHERE contact_id = _contact_id
    AND status NOT IN ('closed');

  IF _active_conv_count > 0 THEN
    _score := _score + 15;
  END IF;

  -- +20 se tem oportunidade no pipeline
  SELECT EXISTS(
    SELECT 1 FROM public.opportunities
    WHERE contact_id = _contact_id
  ) INTO _has_opportunity;

  IF _has_opportunity THEN
    _score := _score + 20;
  END IF;

  -- +5 por tag (máximo +10)
  SELECT COUNT(*) INTO _tag_count
  FROM public.contact_tags
  WHERE contact_id = _contact_id;

  _score := _score + LEAST(_tag_count * 5, 10);

  -- +15 se recebeu mensagem nos últimos 7 dias
  SELECT EXISTS(
    SELECT 1
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE c.contact_id = _contact_id
      AND m.created_at >= NOW() - INTERVAL '7 days'
  ) INTO _recent_message;

  IF _recent_message THEN
    _score := _score + 15;
  END IF;

  -- Limita a 100
  RETURN LEAST(_score, 100);
END;
$$;

-- 3) Função que atualiza o score efetivo (respeita override manual)
CREATE OR REPLACE FUNCTION public.recalculate_contact_score(_contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _override integer;
  _auto_score integer;
BEGIN
  -- Verifica se há override manual
  SELECT score_override INTO _override
  FROM public.contacts
  WHERE id = _contact_id;

  -- Se tem override manual, o score é o override
  IF _override IS NOT NULL THEN
    UPDATE public.contacts
    SET score = _override
    WHERE id = _contact_id;
    RETURN;
  END IF;

  -- Caso contrário, calcula automaticamente
  _auto_score := public.calculate_contact_score(_contact_id);

  UPDATE public.contacts
  SET score = _auto_score
  WHERE id = _contact_id;
END;
$$;

-- 4) Trigger functions para recalcular score em eventos relevantes

-- Quando contato é inserido ou atualizado (phone, email, company_name mudam)
CREATE OR REPLACE FUNCTION public.trg_recalc_score_on_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.recalculate_contact_score(NEW.id);
  RETURN NEW;
END;
$$;

-- Quando conversa é criada, atualizada ou excluída
CREATE OR REPLACE FUNCTION public.trg_recalc_score_on_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_contact_score(OLD.contact_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalculate_contact_score(NEW.contact_id);
  IF TG_OP = 'UPDATE' AND OLD.contact_id IS DISTINCT FROM NEW.contact_id THEN
    PERFORM public.recalculate_contact_score(OLD.contact_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Quando mensagem é criada (atividade recente)
CREATE OR REPLACE FUNCTION public.trg_recalc_score_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _contact_id uuid;
BEGIN
  SELECT contact_id INTO _contact_id
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF _contact_id IS NOT NULL THEN
    PERFORM public.recalculate_contact_score(_contact_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Quando tag de contato é adicionada ou removida
CREATE OR REPLACE FUNCTION public.trg_recalc_score_on_contact_tag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_contact_score(OLD.contact_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalculate_contact_score(NEW.contact_id);
  RETURN NEW;
END;
$$;

-- Quando oportunidade é criada ou excluída
CREATE OR REPLACE FUNCTION public.trg_recalc_score_on_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.contact_id IS NOT NULL THEN
      PERFORM public.recalculate_contact_score(OLD.contact_id);
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.contact_id IS NOT NULL THEN
    PERFORM public.recalculate_contact_score(NEW.contact_id);
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.contact_id IS DISTINCT FROM NEW.contact_id AND OLD.contact_id IS NOT NULL THEN
    PERFORM public.recalculate_contact_score(OLD.contact_id);
  END IF;
  RETURN NEW;
END;
$$;

-- 5) Criar os triggers

-- Contato: recalcula ao inserir (após outras trigger como auto_opportunity)
DROP TRIGGER IF EXISTS trg_score_on_contact ON public.contacts;
CREATE TRIGGER trg_score_on_contact
  AFTER INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalc_score_on_contact();

-- Conversas
DROP TRIGGER IF EXISTS trg_score_on_conversation ON public.conversations;
CREATE TRIGGER trg_score_on_conversation
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalc_score_on_conversation();

-- Mensagens
DROP TRIGGER IF EXISTS trg_score_on_message ON public.messages;
CREATE TRIGGER trg_score_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalc_score_on_message();

-- Tags de contato
DROP TRIGGER IF EXISTS trg_score_on_contact_tag ON public.contact_tags;
CREATE TRIGGER trg_score_on_contact_tag
  AFTER INSERT OR DELETE ON public.contact_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalc_score_on_contact_tag();

-- Oportunidades
DROP TRIGGER IF EXISTS trg_score_on_opportunity ON public.opportunities;
CREATE TRIGGER trg_score_on_opportunity
  AFTER INSERT OR UPDATE OF contact_id OR DELETE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalc_score_on_opportunity();

-- 6) Recalcular todos os scores existentes
DO $$
DECLARE
  _cid uuid;
BEGIN
  FOR _cid IN SELECT id FROM public.contacts LOOP
    PERFORM public.recalculate_contact_score(_cid);
  END LOOP;
END;
$$;
