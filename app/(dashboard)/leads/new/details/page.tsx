import Link from "next/link";
import { redirect } from "next/navigation";

import { NewLeadDetailsStep } from "@/components/leads/NewLeadDetailsStep";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface NewLeadDetailsPageProps {
  searchParams: Promise<{ country?: string; state?: string; city?: string }>;
}

export default async function NewLeadDetailsPage({ searchParams }: NewLeadDetailsPageProps) {
  const params = await searchParams;

  if (!params.country || !params.state || !params.city) {
    redirect("/leads/new/location");
  }

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link href="/leads/new/location">Back to Location Step</Link>
      </Button>
      <Card>
        <CardContent className="p-4 text-xs text-zinc-600">
          Lead is created in this step. Demo sent, brochure sent, call schedule, and remarks are managed from the lead detail page.
          <Link href="/" className="ml-2 text-zinc-900 underline">
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
      <NewLeadDetailsStep country={params.country} state={params.state} city={params.city} />
    </section>
  );
}
