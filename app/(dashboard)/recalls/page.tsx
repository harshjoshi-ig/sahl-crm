import { createClient } from "@/lib/supabase/server";
import { RecallCalendar } from "@/components/leads/RecallCalendar";
import { Card, CardContent } from "@/components/ui/card";

export default async function RecallsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("id,name,phone_number,country,state,city,next_recall_at,lead_status")
    .not("next_recall_at", "is", null)
    .order("next_recall_at", { ascending: true });

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-lg font-semibold text-zinc-900">Unable to load recall calendar</p>
          <p className="text-sm text-zinc-500">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-emerald-50/40 p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Follow-up Planner</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">Recall Calendar</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600">
          Keep callbacks organized by date, quickly review upcoming follow-ups, and open any lead in one click.
        </p>
      </div>
      <RecallCalendar leads={data ?? []} />
    </section>
  );
}
