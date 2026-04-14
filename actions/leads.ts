"use server";

import { revalidatePath } from "next/cache";

import {
  makeLeadKey,
  scrapeRestaurantsByArea,
  type AreaRestaurantCandidate,
} from "@/lib/maps/googleMaps";
import { createClient } from "@/lib/supabase/server";
import { leadSchema, type LeadInput } from "@/lib/validations/lead";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface LeadLockResult extends ActionResult {
  isLockedByAnotherUser?: boolean;
  lockedByName?: string;
  lockExpiresAt?: string;
}

export interface SearchAreaActionResult extends ActionResult {
  data?: AreaRestaurantCandidate[];
}

export interface ImportAreaActionResult extends ActionResult {
  importedCount?: number;
}

function mapLeadError(message: string, code?: string) {
  if (
    code === "PGRST205" ||
    message.includes("Could not find the table 'public.restaurants' in the schema cache")
  ) {
    return "Database not initialized. Run supabase/migrations/001_init.sql in Supabase SQL Editor, then try again.";
  }

  return message;
}

async function ensureProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null },
): Promise<ActionResult> {
  const emailFallback =
    typeof user.email === "string" && user.email.includes("@")
      ? user.email.split("@")[0]
      : null;
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : emailFallback;
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    return { success: false, error: mapLeadError(error.message, error.code) };
  }

  return { success: true };
}

export async function createLead(input: LeadInput): Promise<ActionResult> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid lead data" };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be signed in to create a lead" };
  }

  const profileResult = await ensureProfile(supabase, user);
  if (!profileResult.success) {
    return profileResult;
  }

  const { error } = await supabase.from("restaurants").insert({
    ...parsed.data,
    email: parsed.data.email || null,
    created_by: user.id,
    meeting_scheduled_at: parsed.data.meeting_scheduled_at?.toISOString() ?? null,
  });

  if (error) {
    return { success: false, error: mapLeadError(error.message, error.code) };
  }

  revalidatePath("/");
  revalidatePath("/leads/new");
  return { success: true };
}

export async function updateLead(leadId: string, input: LeadInput): Promise<ActionResult> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid lead data" };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be signed in to update a lead" };
  }

  const profileResult = await ensureProfile(supabase, user);
  if (!profileResult.success) {
    return profileResult;
  }

  const { error } = await supabase
    .from("restaurants")
    .update({
      ...parsed.data,
      email: parsed.data.email || null,
      meeting_scheduled_at: parsed.data.meeting_scheduled_at?.toISOString() ?? null,
    })
    .eq("id", leadId);

  if (error) {
    return { success: false, error: mapLeadError(error.message, error.code) };
  }

  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}

export async function toggleMilestone(
  leadId: string,
  field: "demo_sent" | "brochure_sent",
  value: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be signed in to update milestones" };
  }

  const profileResult = await ensureProfile(supabase, user);
  if (!profileResult.success) {
    return profileResult;
  }

  const { error } = await supabase
    .from("restaurants")
    .update({ [field]: value })
    .eq("id", leadId);

  if (error) {
    return { success: false, error: mapLeadError(error.message, error.code) };
  }

  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}

export async function setMeetingSchedule(
  leadId: string,
  meetingScheduledAt: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be signed in to update call schedule" };
  }

  const profileResult = await ensureProfile(supabase, user);
  if (!profileResult.success) {
    return profileResult;
  }

  const { error } = await supabase
    .from("restaurants")
    .update({
      meeting_scheduled_at: meetingScheduledAt,
    })
    .eq("id", leadId);

  if (error) {
    return { success: false, error: mapLeadError(error.message, error.code) };
  }

  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}

export async function acquireLeadLock(leadId: string): Promise<LeadLockResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be signed in to open this lead" };
  }

  const { data: lead, error: leadError } = await supabase
    .from("restaurants")
    .select("locked_by, lock_expires_at")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    const message = leadError?.message ?? "Lead not found";
    if (message.includes("column") && message.includes("locked_by")) {
      return {
        success: false,
        error:
          "Lead locking columns are missing. Run supabase/migrations/002_collaboration_locking.sql in Supabase SQL Editor.",
      };
    }

    return { success: false, error: mapLeadError(message, leadError?.code) };
  }

  const now = Date.now();
  const existingLockExpiresAt = lead.lock_expires_at ? new Date(lead.lock_expires_at).getTime() : 0;

  if (lead.locked_by && lead.locked_by !== user.id && existingLockExpiresAt > now) {
    const { data: lockProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", lead.locked_by)
      .single();

    return {
      success: false,
      isLockedByAnotherUser: true,
      error: "This lead is currently open by another user",
      lockedByName: lockProfile?.full_name ?? "Another user",
      lockExpiresAt: lead.lock_expires_at,
    };
  }

  if (lead.locked_by === user.id && existingLockExpiresAt > now) {
    return { success: true, lockExpiresAt: lead.lock_expires_at ?? undefined };
  }

  const nextExpire = new Date(now + 24 * 60 * 60 * 1000).toISOString();

  const { error: releasePreviousError } = await supabase
    .from("restaurants")
    .update({ locked_by: null, lock_expires_at: null })
    .eq("locked_by", user.id)
    .neq("id", leadId);

  if (releasePreviousError) {
    return { success: false, error: mapLeadError(releasePreviousError.message, releasePreviousError.code) };
  }

  let { error: lockError } = await supabase
    .from("restaurants")
    .update({ locked_by: user.id, lock_expires_at: nextExpire })
    .eq("id", leadId);

  if (lockError?.code === "23503") {
    const profileResult = await ensureProfile(supabase, user);
    if (!profileResult.success) {
      return profileResult;
    }

    const retry = await supabase
      .from("restaurants")
      .update({ locked_by: user.id, lock_expires_at: nextExpire })
      .eq("id", leadId);
    lockError = retry.error;
  }

  if (lockError) {
    return { success: false, error: mapLeadError(lockError.message, lockError.code) };
  }

    const today = new Date().toISOString().slice(0, 10);
    const { data: insertedEvent, error: eventError } = await supabase
      .from("lead_take_events")
      .insert({
        lead_id: leadId,
        user_id: user.id,
        log_date: today,
      })
      .select("id");

    if (eventError && eventError.code !== "23505") {
      return { success: false, error: mapLeadError(eventError.message, eventError.code) };
    }

    if (insertedEvent && insertedEvent.length > 0) {
      const { data: existingLog } = await supabase
        .from("daily_lead_logs")
        .select("id, leads_taken_count")
        .eq("user_id", user.id)
        .eq("log_date", today)
        .maybeSingle();

      if (existingLog) {
        const { error: logUpdateError } = await supabase
          .from("daily_lead_logs")
          .update({
            leads_taken_count: (existingLog.leads_taken_count ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingLog.id);

        if (logUpdateError) {
          return { success: false, error: mapLeadError(logUpdateError.message, logUpdateError.code) };
        }
      } else {
        const { error: logInsertError } = await supabase.from("daily_lead_logs").insert({
          user_id: user.id,
          log_date: today,
          leads_taken_count: 1,
        });

        if (logInsertError) {
          return { success: false, error: mapLeadError(logInsertError.message, logInsertError.code) };
        }
      }
    }

  return { success: true, lockExpiresAt: nextExpire };
}

export async function heartbeatLeadLock(leadId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be signed in" };
  }

  const nextExpire = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("restaurants")
    .update({ lock_expires_at: nextExpire })
    .eq("id", leadId)
    .eq("locked_by", user.id)
    .select("id");

  if (error) {
    return { success: false, error: mapLeadError(error.message, error.code) };
  }

  if (!data || data.length === 0) {
    return { success: false, error: "Lock no longer belongs to this user" };
  }

  return { success: true };
}

export async function releaseLeadLock(leadId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be signed in" };
  }

  const { error } = await supabase
    .from("restaurants")
    .update({ locked_by: null, lock_expires_at: null })
    .eq("id", leadId)
    .eq("locked_by", user.id);

  if (error) {
    return { success: false, error: mapLeadError(error.message, error.code) };
  }

  return { success: true };
}

export async function searchAreaRestaurants(input: {
  country: string;
  state: string;
  city: string;
  query?: string;
  maxResults?: number;
}): Promise<SearchAreaActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be signed in to search restaurants" };
  }

  if (!input.country || !input.state || !input.city) {
    return { success: false, error: "Location is required" };
  }

  const maxResults = Math.min(Math.max(input.maxResults ?? 25, 5), 1000);

  try {
    const { data: existingLeads, error: existingError } = await supabase
      .from("restaurants")
      .select("name, phone_number")
      .eq("country", input.country)
      .eq("state", input.state)
      .eq("city", input.city);

    if (existingError) {
      return { success: false, error: mapLeadError(existingError.message, existingError.code) };
    }

    const excludeKeys = (existingLeads ?? []).map((lead) =>
      makeLeadKey(lead.name ?? "", lead.phone_number),
    );

    const data = await scrapeRestaurantsByArea({
      country: input.country,
      state: input.state,
      city: input.city,
      query: input.query,
      maxResults,
      excludeKeys,
    });

    if (data.length === 0) {
      return {
        success: false,
        error:
          "No new restaurants found for this area. Existing leads were skipped. Try changing query or nearby city.",
      };
    }

    return { success: true, data };
  } catch {
    return {
      success: false,
      error:
        "Unable to fetch restaurants for this area right now. Try again in a moment.",
    };
  }
}

export async function importAreaRestaurantLeads(input: {
  country: string;
  state: string;
  city: string;
  restaurants: AreaRestaurantCandidate[];
}): Promise<ImportAreaActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be signed in to import leads" };
  }

  const profileResult = await ensureProfile(supabase, user);
  if (!profileResult.success) {
    return profileResult;
  }

  if (!input.restaurants || input.restaurants.length === 0) {
    return { success: false, error: "Select at least one restaurant to import" };
  }

  const rows = input.restaurants
    .filter((item) => item.name && item.name.trim().length > 0)
    .map((item) => ({
      name: item.name.trim(),
      phone_number: item.phone_number,
      email: null,
      country: input.country,
      state: input.state,
      city: input.city,
      demo_sent: false,
      brochure_sent: false,
      meeting_scheduled_at: null,
      lead_status: null,
      created_by: user.id,
    }));

  if (rows.length === 0) {
    return { success: false, error: "No valid restaurants to import" };
  }

  const { error } = await supabase.from("restaurants").insert(rows);

  if (error) {
    return { success: false, error: mapLeadError(error.message, error.code) };
  }

  revalidatePath("/");
  revalidatePath("/leads/new/details");
  return { success: true, importedCount: rows.length };
}
