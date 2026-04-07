import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const DAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

interface DaySchedule {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

export default function ConfigHorarios() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    DAYS.map((d) => ({
      day_of_week: d.value,
      is_open: d.value >= 1 && d.value <= 5, // Mon-Fri open by default
      open_time: "09:00",
      close_time: "18:00",
    }))
  );

  useEffect(() => {
    fetchSchedule();
  }, [profile?.company_id]);

  async function fetchSchedule() {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("business_hours")
      .select("day_of_week, is_open, open_time, close_time")
      .eq("company_id", profile.company_id)
      .order("day_of_week");

    if (error) {
      // Table might not exist yet, use defaults
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setSchedule(
        DAYS.map((d) => {
          const existing = data.find((r) => r.day_of_week === d.value);
          return existing
            ? {
                day_of_week: existing.day_of_week,
                is_open: existing.is_open ?? false,
                open_time: existing.open_time?.slice(0, 5) || "09:00",
                close_time: existing.close_time?.slice(0, 5) || "18:00",
              }
            : {
                day_of_week: d.value,
                is_open: false,
                open_time: "09:00",
                close_time: "18:00",
              };
        })
      );
    }
    setLoading(false);
  }

  function updateDay(dayIndex: number, field: keyof DaySchedule, value: unknown) {
    setSchedule((prev) =>
      prev.map((d) =>
        d.day_of_week === dayIndex ? { ...d, [field]: value } : d
      )
    );
  }

  async function handleSave() {
    if (!profile?.company_id) return;
    setSaving(true);

    // Upsert all days
    const rows = schedule.map((d) => ({
      company_id: profile.company_id!,
      day_of_week: d.day_of_week,
      is_open: d.is_open,
      open_time: d.open_time,
      close_time: d.close_time,
    }));

    const { error } = await supabase
      .from("business_hours")
      .upsert(rows, { onConflict: "company_id,day_of_week" });

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Horários salvos com sucesso!");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/configuracoes")}
          className="rounded-lg p-2 hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Horário de Atendimento</h1>
          <p className="text-muted-foreground text-sm">
            Defina os horários de operação da sua empresa
          </p>
        </div>
      </div>

      {/* Schedule */}
      <div className="rounded-xl border bg-card divide-y">
        {schedule.map((day) => {
          const dayInfo = DAYS.find((d) => d.value === day.day_of_week)!;
          return (
            <div
              key={day.day_of_week}
              className="flex items-center gap-4 p-4"
            >
              {/* Toggle */}
              <button
                onClick={() => updateDay(day.day_of_week, "is_open", !day.is_open)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors ${
                  day.is_open
                    ? "bg-primary border-primary"
                    : "bg-secondary border-border"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    day.is_open ? "translate-x-5" : "translate-x-0.5"
                  }`}
                  style={{ marginTop: "1px" }}
                />
              </button>

              {/* Day name */}
              <span
                className={`w-32 text-sm font-medium ${
                  day.is_open ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {dayInfo.label}
              </span>

              {/* Time inputs */}
              {day.is_open ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={day.open_time}
                    onChange={(e) =>
                      updateDay(day.day_of_week, "open_time", e.target.value)
                    }
                    className="rounded-lg border bg-secondary/50 py-1.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <span className="text-xs text-muted-foreground">até</span>
                  <input
                    type="time"
                    value={day.close_time}
                    onChange={(e) =>
                      updateDay(day.day_of_week, "close_time", e.target.value)
                    }
                    className="rounded-lg border bg-secondary/50 py-1.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Fechado
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Salvando..." : "Salvar horários"}
        </button>
      </div>
    </div>
  );
}
