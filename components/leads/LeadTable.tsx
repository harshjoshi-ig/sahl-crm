"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import type { Lead, RemarkFlag } from "@/lib/types";
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

export function LeadTable({ leads }: LeadTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | RemarkFlag>("all");

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const nameMatch = lead.name.toLowerCase().includes(search.toLowerCase());
      const statusMatch = status === "all" ? true : lead.lead_status === status;
      return nameMatch && statusMatch;
    });
  }, [leads, search, status]);

  if (leads.length === 0) {
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
                  {lead.meeting_scheduled_at ? formatUtcDate(lead.meeting_scheduled_at) : "-"}
                </TableCell>
                <TableCell className="text-xs text-zinc-500" suppressHydrationWarning>
                  {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/leads/${lead.id}`}>View</Link>
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
