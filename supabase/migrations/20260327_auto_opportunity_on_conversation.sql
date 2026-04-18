-- Trigger: ao inserir nova conversa, cria oportunidade na primeira etapa do pipeline
CREATE OR REPLACE FUNCTION public.auto_create_opportunity_on_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _stage_id uuid;
  _contact_name text;
  _max_position numeric;
BEGIN
  -- Busca a primeira etapa (menor position) do pipeline da empresa
  SELECT id INTO _stage_id
  FROM public.pipeline_stages
  WHERE company_id = NEW.company_id
  ORDER BY position ASC
  LIMIT 1;

  -- Se não há etapas configuradas, não cria oportunidade
  IF _stage_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verifica se já existe oportunidade para este contato nesta empresa
  -- (evita duplicatas quando o mesmo contato inicia várias conversas)
  IF EXISTS (
    SELECT 1 FROM public.opportunities
    WHERE contact_id = NEW.contact_id
      AND company_id = NEW.company_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Busca nome do contato
  SELECT name INTO _contact_name
  FROM public.contacts
  WHERE id = NEW.contact_id;

  -- Calcula próxima posição na etapa
  SELECT COALESCE(MAX(position), -1) + 1 INTO _max_position
  FROM public.opportunities
  WHERE stage_id = _stage_id;

  -- Cria a oportunidade
  INSERT INTO public.opportunities (
    company_id, stage_id, contact_id, title, value, probability, position
  ) VALUES (
    NEW.company_id,
    _stage_id,
    NEW.contact_id,
    COALESCE(_contact_name, 'Nova oportunidade'),
    0,
    0,
    _max_position
  );

  RETURN NEW;
END;
$$;

-- Cria o trigger apenas para INSERT
DROP TRIGGER IF EXISTS trg_auto_create_opportunity ON public.conversations;
CREATE TRIGGER trg_auto_create_opportunity
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_opportunity_on_conversation();
