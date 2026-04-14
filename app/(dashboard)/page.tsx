import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { LeadTable } from "@/components/leads/LeadTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      "id,name,phone_number,email,country,state,city,demo_sent,brochure_sent,meeting_scheduled_at,next_recall_at,locked_by,lock_expires_at,done_until,last_remarked_at,lead_status,created_at,created_by,lock_profile:locked_by(full_name)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-lg font-semibold text-zinc-900">Unable to load leads</p>
          <p className="text-sm text-zinc-500">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  const now = Date.now();
  const normalizedLeads = (data ?? []).map((lead) => ({
    ...lead,
    locked_by_name: (() => {
      const lockProfile = lead.lock_profile as { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
      return Array.isArray(lockProfile)
        ? lockProfile[0]?.full_name ?? null
        : lockProfile?.full_name ?? null;
    })(),
  }));

  const sortedLeads = normalizedLeads.slice().sort((a, b) => {
    const aDone = a.done_until && new Date(a.done_until).getTime() > now;
    const bDone = b.done_until && new Date(b.done_until).getTime() > now;

    if (aDone && !bDone) {
      return 1;
    }

    if (!aDone && bDone) {
      return -1;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Restaurants</h2>
          <p className="text-sm text-zinc-500">All active leads and current status.</p>
        </div>
        <Button asChild>
          <Link href="/leads/new">+ New Lead</Link>
        </Button>
      </div>
      <LeadTable leads={sortedLeads} />
    </section>
  );
}
