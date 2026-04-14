"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import type { Lead, RemarkFlag } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { Card, CardContent } from "@/components/ui/card";

interface LeadTableProps {
  leads: Lead[];
}

function formatUtcDate(timestamp: string) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function sortLeads(leads: Lead[]) {
  const now = Date.now();

  return leads.slice().sort((a, b) => {
    const aDone = Boolean(a.done_until && new Date(a.done_until).getTime() > now);
    const bDone = Boolean(b.done_until && new Date(b.done_until).getTime() > now);

    if (aDone && !bDone) {
      return 1;
    }

    if (!aDone && bDone) {
      return -1;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function isLocked(lead: Lead) {
  if (!lead.locked_by || !lead.lock_expires_at) {
    return false;
  }

  return new Date(lead.lock_expires_at).getTime() > Date.now();
}

export function LeadTable({ leads }: LeadTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | RemarkFlag>("all");
  const [liveLeads, setLiveLeads] = useState<Lead[]>(sortLeads(leads));
  const lockNameCacheRef = useRef(new Map<string, string | null>());

  useEffect(() => {
    setLiveLeads(sortLeads(leads));
    const nextCache = new Map<string, string | null>();
    for (const lead of leads) {
      if (lead.locked_by) {
        nextCache.set(lead.locked_by, lead.locked_by_name ?? null);
      }
    }
    lockNameCacheRef.current = nextCache;
  }, [leads]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("restaurants-dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurants" },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string }).id;
            if (!deletedId) {
              return;
            }

            setLiveLeads((current) => current.filter((lead) => lead.id !== deletedId));
            return;
          }

          const row = payload.new as Record<string, unknown>;
          const id = typeof row.id === "string" ? row.id : "";
          if (!id) {
            return;
          }

          const lockedBy = typeof row.locked_by === "string" ? row.locked_by : null;
          let lockedByName: string | null = null;

          if (lockedBy) {
            lockedByName = lockNameCacheRef.current.get(lockedBy) ?? null;

            if (lockedByName === null) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", lockedBy)
                .single();
              lockedByName = profile?.full_name ?? null;
              lockNameCacheRef.current.set(lockedBy, lockedByName);
            }
          }

          const nextLead: Lead = {
            id,
            name: String(row.name ?? ""),
            phone_number: (row.phone_number as string | null) ?? null,
            email: (row.email as string | null) ?? null,
            country: String(row.country ?? ""),
            state: String(row.state ?? ""),
            city: String(row.city ?? ""),
            demo_sent: Boolean(row.demo_sent),
            brochure_sent: Boolean(row.brochure_sent),
            meeting_scheduled_at: (row.meeting_scheduled_at as string | null) ?? null,
            next_recall_at: (row.next_recall_at as string | null) ?? null,
            locked_by: lockedBy,
            locked_by_name: lockedByName,
            lock_expires_at: (row.lock_expires_at as string | null) ?? null,
            done_until: (row.done_until as string | null) ?? null,
            last_remarked_at: (row.last_remarked_at as string | null) ?? null,
            lead_status: (row.lead_status as RemarkFlag | null) ?? null,
            created_at: String(row.created_at ?? new Date().toISOString()),
            created_by: String(row.created_by ?? ""),
          };

          setLiveLeads((current) => {
            const withoutCurrent = current.filter((lead) => lead.id !== nextLead.id);
            return sortLeads([nextLead, ...withoutCurrent]);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const filteredLeads = useMemo(() => {
    return liveLeads.filter((lead) => {
      const nameMatch = lead.name.toLowerCase().includes(search.toLowerCase());
      const statusMatch = status === "all" ? true : lead.lead_status === status;
      return nameMatch && statusMatch;
    });
  }, [liveLeads, search, status]);

  if (liveLeads.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-lg font-semibold text-zinc-900">No leads yet</p>
          <p className="text-sm text-zinc-500">Create your first restaurant lead to start tracking outreach.</p>
          <Button asChild>
            <Link href="/leads/new">+ New Lead</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative w-full">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search leads by name"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as "all" | RemarkFlag)}>
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="call_again">Call Again</SelectItem>
            <SelectItem value="interested">Interested</SelectItem>
            <SelectItem value="not_interested">Not Interested</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Demo Sent</TableHead>
              <TableHead>Brochure Sent</TableHead>
              <TableHead>Lead Status</TableHead>
              <TableHead>Lock</TableHead>
              <TableHead>Meeting Date</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium text-zinc-900">{lead.name}</TableCell>
                <TableCell>{lead.city}, {lead.state}</TableCell>
                <TableCell>{lead.demo_sent ? "Yes" : "No"}</TableCell>
                <TableCell>{lead.brochure_sent ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <LeadStatusBadge status={lead.lead_status} />
                </TableCell>
                <TableCell>
                  {isLocked(lead) ? (
                    <Badge variant="purple">Locked by {lead.locked_by_name ?? "user"}</Badge>
                  ) : (
                    <Badge variant="default">Open</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {lead.meeting_scheduled_at ? formatUtcDate(lead.meeting_scheduled_at) : "-"}
                </TableCell>
                <TableCell className="text-xs text-zinc-500" suppressHydrationWarning>
                  {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/leads/${lead.id}`} prefetch>
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
