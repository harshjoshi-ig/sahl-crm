"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, isSameDay, isWithinInterval, startOfDay, endOfWeek, startOfWeek } from "date-fns";
import { ArrowRight, CalendarClock, Clock3, Phone, Sparkles } from "lucide-react";

import type { Lead } from "@/lib/types";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RecallCalendarProps {
  leads: Array<
    Pick<Lead, "id" | "name" | "phone_number" | "country" | "state" | "city" | "next_recall_at" | "lead_status">
  >;
}

function toDateKey(value: Date) {
  return format(value, "yyyy-MM-dd");
}

export function RecallCalendar({ leads }: RecallCalendarProps) {
  const recallLeads = useMemo(() => {
    return leads
      .filter((lead) => Boolean(lead.next_recall_at))
      .sort((a, b) => new Date(a.next_recall_at as string).getTime() - new Date(b.next_recall_at as string).getTime());
  }, [leads]);

  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    if (recallLeads.length > 0 && recallLeads[0].next_recall_at) {
      return new Date(recallLeads[0].next_recall_at);
    }

    return new Date();
  });

  const recallsByDay = useMemo(() => {
    const map = new Map<string, RecallCalendarProps["leads"]>();

    for (const lead of recallLeads) {
      if (!lead.next_recall_at) {
        continue;
      }

      const key = toDateKey(new Date(lead.next_recall_at));
      const current = map.get(key) ?? [];
      current.push(lead);
      map.set(key, current);
    }

    return map;
  }, [recallLeads]);

  const selectedKey = toDateKey(selectedDay);
  const itemsForDay = recallsByDay.get(selectedKey) ?? [];

  const highlightedDays = Array.from(
    new Set(recallLeads.map((lead) => toDateKey(new Date(lead.next_recall_at as string)))),
  ).map((value) => new Date(`${value}T00:00:00`));

  const dueTodayCount = recallLeads.filter((lead) => isSameDay(new Date(lead.next_recall_at as string), new Date())).length;

  const dueThisWeekCount = recallLeads.filter((lead) => {
    const when = new Date(lead.next_recall_at as string);
    return isWithinInterval(when, {
      start: startOfWeek(new Date(), { weekStartsOn: 1 }),
      end: endOfWeek(new Date(), { weekStartsOn: 1 }),
    });
  }).length;

  const upcomingRecalls = recallLeads
    .filter((lead) => new Date(lead.next_recall_at as string) >= startOfDay(new Date()))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-zinc-200 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white shadow-md shadow-zinc-300/50">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-300">Total recalls</p>
              <p className="mt-2 text-3xl font-semibold leading-none text-white">{recallLeads.length}</p>
            </div>
            <CalendarClock className="h-5 w-5 text-zinc-200" />
          </CardContent>
        </Card>
        <Card className="border-zinc-200 bg-white shadow-sm shadow-zinc-200/70">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Due today</p>
              <p className="mt-2 text-3xl font-semibold leading-none text-zinc-900">{dueTodayCount}</p>
            </div>
            <Clock3 className="h-5 w-5 text-zinc-500" />
          </CardContent>
        </Card>
        <Card className="border-zinc-200 bg-white shadow-sm shadow-zinc-200/70">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">This week</p>
              <p className="mt-2 text-3xl font-semibold leading-none text-zinc-900">{dueThisWeekCount}</p>
              <p className="mt-2 text-xs text-zinc-500">Selected {format(selectedDay, "MMM d, yyyy")}</p>
            </div>
            <Badge variant="default" className="bg-zinc-100 text-zinc-700">
              {itemsForDay.length} recall{itemsForDay.length === 1 ? "" : "s"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(470px,520px)_minmax(0,1fr)]">
        <Card className="overflow-hidden border-zinc-200 bg-white shadow-sm shadow-zinc-200/60">
          <CardContent className="p-0">
            <div className="border-b border-zinc-100 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-7 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Calendar</p>
              <p className="mt-1 text-base font-semibold text-zinc-900">Pick any date to review scheduled recalls</p>
            </div>

            <div className="p-5">
              <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={(day) => setSelectedDay(day ?? new Date())}
                captionLayout="dropdown"
                fromYear={new Date().getFullYear() - 2}
                toYear={new Date().getFullYear() + 3}
                modifiers={{ hasRecall: highlightedDays }}
                modifiersClassNames={{
                  hasRecall:
                    "relative font-semibold text-zinc-900 after:absolute after:bottom-1.5 after:left-1/2 after:h-2 after:w-2 after:-translate-x-1/2 after:rounded-full after:bg-emerald-500",
                }}
                className="w-full rounded-2xl border border-zinc-100 bg-white p-3"
                classNames={{
                  month: "space-y-4 w-full",
                  table: "w-full border-collapse",
                  head_row: "grid grid-cols-7",
                  row: "mt-1 grid grid-cols-7",
                  head_cell: "h-10 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400",
                  cell: "h-[58px] w-full p-0",
                  day: "h-12 w-12 rounded-2xl text-sm font-medium text-zinc-700 transition hover:bg-zinc-100",
                  day_selected:
                    "bg-zinc-900 text-white shadow-sm hover:bg-zinc-900 hover:text-white focus:bg-zinc-900 focus:text-white",
                  day_today: "border border-zinc-300 bg-zinc-50 text-zinc-900",
                  caption_label: "text-base font-semibold text-zinc-900",
                  nav_button: "h-9 w-9 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100",
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white shadow-sm shadow-zinc-200/60">
          <CardContent className="space-y-4 p-6">
            <div className="border-b border-zinc-100 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Selected day</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{format(selectedDay, "EEEE, MMM d")}</p>
              <p className="mt-1 text-sm text-zinc-500">{itemsForDay.length} scheduled follow-up{itemsForDay.length === 1 ? "" : "s"}</p>
            </div>

            {itemsForDay.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/70 p-6">
                <div className="flex items-center gap-2 text-zinc-700">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-sm font-medium">No recalls set for this date.</p>
                </div>
                {upcomingRecalls.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Upcoming recalls</p>
                    {upcomingRecalls.map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/leads/${lead.id}`}
                        className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-300"
                      >
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">{lead.name}</p>
                          <p className="text-xs text-zinc-500">{format(new Date(lead.next_recall_at as string), "MMM d, h:mm a")}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-zinc-500" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">Start by adding a recall date while submitting a remark on any lead.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {itemsForDay.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{lead.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">{lead.city}, {lead.state}</p>
                        <p className="mt-3 flex items-center gap-2 text-xs text-zinc-600">
                          <Phone className="h-3.5 w-3.5" />
                          {lead.phone_number ?? "Phone not set"}
                        </p>
                      </div>
                      <Badge variant="default" className="border-zinc-300 bg-white text-zinc-700">
                        {lead.lead_status ? lead.lead_status.replaceAll("_", " ") : "pending"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
