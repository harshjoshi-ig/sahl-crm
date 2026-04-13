import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { LeadTable } from "@/components/leads/LeadTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
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
      <LeadTable leads={data ?? []} />
    </section>
  );
}
