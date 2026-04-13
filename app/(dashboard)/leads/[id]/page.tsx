import { notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import type { RemarkWithProfile } from "@/lib/types";
import { LeadForm } from "@/components/leads/LeadForm";
import { MilestoneToggles } from "@/components/leads/MilestoneToggles";
import { RemarkForm } from "@/components/remarks/RemarkForm";
import { RemarkTimeline } from "@/components/remarks/RemarkTimeline";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: lead, error: leadError }, { data: remarks, error: remarksError }] = await Promise.all([
    supabase.from("restaurants").select("*").eq("id", id).single(),
    supabase
      .from("remarks")
      .select("id, restaurant_id, created_by, content, status_flag, created_at, profiles:created_by(full_name, avatar_url)")
      .eq("restaurant_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (leadError) {
    if (leadError.code === "PGRST116") {
      notFound();
    }

    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-lg font-semibold text-zinc-900">Unable to load this lead</p>
          <p className="text-sm text-zinc-500">{leadError.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (remarksError) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-lg font-semibold text-zinc-900">Unable to load remarks</p>
          <p className="text-sm text-zinc-500">{remarksError.message}</p>
        </CardContent>
      </Card>
    );
  }

  const normalizedRemarks: RemarkWithProfile[] = (remarks ?? []).map((remark) => ({
    id: remark.id,
    restaurant_id: remark.restaurant_id,
    created_by: remark.created_by,
    content: remark.content,
    status_flag: remark.status_flag,
    created_at: remark.created_at,
    profiles: Array.isArray(remark.profiles) ? remark.profiles[0] ?? null : remark.profiles,
  }));

  return (
    <section className="space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link href="/">Back to Dashboard</Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <LeadForm mode="update" leadId={lead.id} initialLead={lead} />
        <MilestoneToggles
          leadId={lead.id}
          demoSent={lead.demo_sent}
          brochureSent={lead.brochure_sent}
          meetingScheduledAt={lead.meeting_scheduled_at}
        />
      </div>
      <div className="space-y-4">
        <RemarkForm restaurantId={id} />
        <RemarkTimeline restaurantId={id} initialRemarks={normalizedRemarks} />
      </div>
      </div>
    </section>
  );
}
