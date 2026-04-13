import Link from "next/link";

import { NewLeadLocationStep } from "@/components/leads/NewLeadLocationStep";
import { Button } from "@/components/ui/button";

interface NewLeadLocationPageProps {
  searchParams: Promise<{ country?: string; state?: string; city?: string }>;
}

export default async function NewLeadLocationPage({ searchParams }: NewLeadLocationPageProps) {
  const params = await searchParams;

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link href="/">Back to Dashboard</Link>
      </Button>
      <NewLeadLocationStep
        initialValues={{
          country: params.country,
          state: params.state,
          city: params.city,
        }}
      />
    </section>
  );
}
