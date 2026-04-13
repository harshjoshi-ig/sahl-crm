"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { leadSchema, type LeadInput } from "@/lib/validations/lead";

export interface ActionResult {
  success: boolean;
  error?: string;
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
    .eq("id", leadId)
    .eq("created_by", user.id);

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
    .eq("id", leadId)
    .eq("created_by", user.id);

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
    .eq("id", leadId)
    .eq("created_by", user.id);

  if (error) {
    return { success: false, error: mapLeadError(error.message, error.code) };
  }

  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}
