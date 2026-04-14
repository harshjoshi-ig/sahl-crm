import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface UserLogLeadsPageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ date?: string }>;
}

export default async function UserLogLeadsPage({ params, searchParams }: UserLogLeadsPageProps) {
  const { userId } = await params;
  const { date } = await searchParams;

  const selectedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);
  const supabase = await createClient();

  const [{ data: profile }, { data: events, error }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase
      .from("lead_take_events")
      .select("id, log_date, created_at, lead_id, restaurants:lead_id(id, name, city, state, phone_number, lead_status)")
      .eq("user_id", userId)
      .eq("log_date", selectedDate)
      .order("created_at", { ascending: false }),
  ]);

  if (error) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/logs">Back to Daily Logs</Link>
          </Button>
          <div>
            <p className="text-lg font-semibold text-zinc-900">Unable to load user lead logs</p>
            <p className="text-sm text-zinc-500">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fullName = profile?.full_name ?? "Unknown user";

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{fullName} - Called Leads</h2>
          <p className="text-sm text-zinc-500">Date: {selectedDate}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/logs">Back to Daily Logs</Link>
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Taken At</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(events ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-zinc-500">
                  No leads were taken by this user on {selectedDate}.
                </TableCell>
              </TableRow>
            ) : (
              (events ?? []).map((event) => {
                const lead = Array.isArray(event.restaurants) ? event.restaurants[0] : event.restaurants;

                return (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium text-zinc-900">{lead?.name ?? "Unknown lead"}</TableCell>
                    <TableCell>{lead ? `${lead.city}, ${lead.state}` : "-"}</TableCell>
                    <TableCell>
                      <Badge variant="default" className="capitalize">
                        {lead?.lead_status ? String(lead.lead_status).replaceAll("_", " ") : "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>{lead?.phone_number ?? "-"}</TableCell>
                    <TableCell>{new Date(event.created_at).toISOString().slice(0, 16).replace("T", " ")} UTC</TableCell>
                    <TableCell>
                      {lead?.id ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/leads/${lead.id}`}>View Lead</Link>
                        </Button>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
