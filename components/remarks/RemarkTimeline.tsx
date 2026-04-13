"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

import type { RemarkWithProfile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const badgeVariantMap = {
  call_again: "blue",
  interested: "green",
  not_interested: "red",
  custom: "purple",
} as const;

function parseRemarkContent(content: string, fallbackFlag: RemarkWithProfile["status_flag"]) {
  if (!content.startsWith("__FLAGS__")) {
    return {
      flags: [fallbackFlag],
      note: content,
    };
  }

  try {
    const parsed = JSON.parse(content.replace("__FLAGS__", "")) as {
      flags?: RemarkWithProfile["status_flag"][];
      note?: string;
    };

    return {
      flags: parsed.flags && parsed.flags.length > 0 ? parsed.flags : [fallbackFlag],
      note: parsed.note ?? "",
    };
  } catch {
    return {
      flags: [fallbackFlag],
      note: content,
    };
  }
}

interface RemarkTimelineProps {
  restaurantId: string;
  initialRemarks: RemarkWithProfile[];
}

function initials(name: string | null) {
  if (!name) {
    return "NA";
  }

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function RemarkTimeline({ restaurantId, initialRemarks }: RemarkTimelineProps) {
  const [remarks, setRemarks] = useState<RemarkWithProfile[]>(initialRemarks);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    setIsLoading(true);

    const channel = supabase
      .channel(`remarks-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "remarks",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", payload.new.created_by)
            .single();

          const nextRemark: RemarkWithProfile = {
            id: payload.new.id as string,
            restaurant_id: payload.new.restaurant_id as string,
            created_by: payload.new.created_by as string,
            content: payload.new.content as string,
            status_flag: payload.new.status_flag as RemarkWithProfile["status_flag"],
            created_at: payload.new.created_at as string,
            profiles: profile ?? null,
          };

          setRemarks((current) => [nextRemark, ...current]);
        },
      )
      .subscribe(() => setIsLoading(false));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  if (isLoading && remarks.length === 0) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (remarks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-zinc-500">No remarks yet. Add the first update above.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {remarks.map((remark) => (
        <Card key={remark.id}>
          <CardContent className="p-4">
            {(() => {
              const parsed = parseRemarkContent(remark.content, remark.status_flag);
              const displayName =
                remark.profiles?.full_name?.trim() || `User ${remark.created_by.slice(0, 6)}`;

              return (
                <>
                  {(() => {
                    const createdAt = new Date(remark.created_at);
                    const exactUtc = createdAt.toISOString().replace("T", " ").replace(".000Z", " UTC");

                    return (
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={remark.profiles?.avatar_url ?? undefined}
                          alt={displayName}
                        />
                        <AvatarFallback>{initials(displayName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{displayName}</p>
                        <p className="text-xs text-zinc-500" suppressHydrationWarning>
                          {formatDistanceToNow(new Date(remark.created_at), { addSuffix: true })}
                        </p>
                        <p className="text-xs text-zinc-500">{exactUtc}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {parsed.flags.map((flag) => (
                        <Badge key={`${remark.id}-${flag}`} variant={badgeVariantMap[flag]}>
                          {flag.replaceAll("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                    );
                  })()}
                  <p className="text-sm text-zinc-700">
                    {parsed.note && parsed.note.length > 0
                      ? parsed.note
                      : `Status updated: ${parsed.flags.map((flag) => flag.replaceAll("_", " ")).join(", ")}`}
                  </p>
                </>
              );
            })()}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
