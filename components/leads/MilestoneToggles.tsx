"use client";

import { useState, useTransition } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { setMeetingSchedule, toggleMilestone } from "@/actions/leads";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MilestoneTogglesProps {
  leadId: string;
  demoSent: boolean;
  brochureSent: boolean;
  meetingScheduledAt: string | null;
}

export function MilestoneToggles({
  leadId,
  demoSent,
  brochureSent,
  meetingScheduledAt,
}: MilestoneTogglesProps) {
  const [isPending, startTransition] = useTransition();
  const [demo, setDemo] = useState(demoSent);
  const [brochure, setBrochure] = useState(brochureSent);
  const [isCallScheduled, setIsCallScheduled] = useState(Boolean(meetingScheduledAt));
  const [meetingDate, setMeetingDate] = useState<Date | null>(
    meetingScheduledAt ? new Date(meetingScheduledAt) : null,
  );

  const handleToggle = (field: "demo_sent" | "brochure_sent", value: boolean) => {
    const previous = field === "demo_sent" ? demo : brochure;

    if (field === "demo_sent") {
      setDemo(value);
    } else {
      setBrochure(value);
    }

    startTransition(async () => {
      const result = await toggleMilestone(leadId, field, value);
      if (!result.success) {
        if (field === "demo_sent") {
          setDemo(previous);
        } else {
          setBrochure(previous);
        }
        toast.error(result.error ?? "Unable to update milestone");
        return;
      }

      toast.success("Milestone updated");
    });
  };

  const handleCallToggle = (value: boolean) => {
    const previousChecked = isCallScheduled;
    const previousDate = meetingDate;

    setIsCallScheduled(value);

    if (!value) {
      setMeetingDate(null);
    }

    startTransition(async () => {
      const result = await setMeetingSchedule(leadId, value ? previousDate?.toISOString() ?? null : null);

      if (!result.success) {
        setIsCallScheduled(previousChecked);
        setMeetingDate(previousDate);
        toast.error(result.error ?? "Unable to update call schedule");
        return;
      }

      toast.success("Call schedule updated");
    });
  };

  const handleDateChange = (value: Date | null) => {
    const previousDate = meetingDate;
    setMeetingDate(value);

    startTransition(async () => {
      const result = await setMeetingSchedule(leadId, value ? value.toISOString() : null);
      if (!result.success) {
        setMeetingDate(previousDate);
        toast.error(result.error ?? "Unable to update call schedule");
        return;
      }

      toast.success("Call schedule updated");
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleToggle("demo_sent", !demo)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleToggle("demo_sent", !demo);
            }
          }}
          className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm"
          aria-disabled={isPending}
        >
          <div>
            <p className="text-sm font-medium text-zinc-900">Demo Sent</p>
            <p className="text-xs text-zinc-500">Track if demo has been sent.</p>
          </div>
          <Checkbox checked={demo} aria-label="Demo sent status" />
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => handleToggle("brochure_sent", !brochure)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleToggle("brochure_sent", !brochure);
            }
          }}
          className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm"
          aria-disabled={isPending}
        >
          <div>
            <p className="text-sm font-medium text-zinc-900">Brochure Sent</p>
            <p className="text-xs text-zinc-500">Track if brochure has been sent.</p>
          </div>
          <Checkbox checked={brochure} aria-label="Brochure sent status" />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Checkbox checked={isCallScheduled} onCheckedChange={(checked) => handleCallToggle(Boolean(checked))} />
          <Label>Call Scheduled</Label>
        </div>

        {isCallScheduled ? (
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !meetingDate && "text-zinc-500",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {meetingDate ? format(meetingDate, "PPP") : "Pick call date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={meetingDate ?? undefined}
                  onSelect={(date) => handleDateChange(date ?? null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button type="button" variant="ghost" onClick={() => handleDateChange(null)} disabled={!meetingDate}>
              Clear
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
