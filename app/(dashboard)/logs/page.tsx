import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function LogsPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("daily_lead_logs")
    .select("id, user_id, log_date, leads_taken_count, updated_at, profiles:user_id(full_name)")
    .eq("log_date", today)
    .order("leads_taken_count", { ascending: false });

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-lg font-semibold text-zinc-900">Unable to load daily logs</p>
          <p className="text-sm text-zinc-500">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Daily Lead Logs</h2>
        <p className="text-sm text-zinc-500">How many leads each user took today.</p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Leads Taken</TableHead>
              <TableHead>Updated At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((row) => {
              const profile = row.profiles as { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
              const fullName = Array.isArray(profile)
                ? profile[0]?.full_name ?? "Unknown"
                : profile?.full_name ?? "Unknown";

              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-zinc-900">
                    <Link
                      href={{ pathname: `/logs/${row.user_id}`, query: { date: row.log_date } }}
                      className="text-zinc-900 underline-offset-4 hover:text-zinc-700 hover:underline"
                    >
                      {fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{row.log_date}</TableCell>
                  <TableCell>{row.leads_taken_count}</TableCell>
                  <TableCell>{new Date(row.updated_at).toISOString().slice(0, 16).replace("T", " ")} UTC</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
