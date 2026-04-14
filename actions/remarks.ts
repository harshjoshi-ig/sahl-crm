"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { remarkSchema } from "@/lib/validations/remark";
import type { RemarkFlag } from "@/lib/types";

export interface ActionResult {
  success: boolean;
  error?: string;
}

function mapRemarkError(message: string, code?: string) {
  if (
    code === "PGRST205" ||
    message.includes("Could not find the table 'public.remarks' in the schema cache") ||
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
    return { success: false, error: mapRemarkError(error.message, error.code) };
  }

  return { success: true };
}

export async function createRemark(
  restaurantId: string,
  content: string | undefined,
  flags: RemarkFlag[],
  recallAt: string | null,
): Promise<ActionResult> {
  const parsed = remarkSchema.safeParse({
    content,
    status_flags: flags,
    recall_at: recallAt ? new Date(recallAt) : null,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid remark" };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be signed in to create a remark" };
  }

  const profileResult = await ensureProfile(supabase, user);
  if (!profileResult.success) {
    return profileResult;
  }

  const note = parsed.data.content?.trim() ?? "";
  const payload = JSON.stringify({ flags: parsed.data.status_flags, note });
  const primaryFlag =
    parsed.data.status_flags.length === 1 ? parsed.data.status_flags[0] : "custom";
  const recallIso = parsed.data.recall_at ? parsed.data.recall_at.toISOString() : null;

  const { error: insertError } = await supabase.from("remarks").insert({
    restaurant_id: restaurantId,
    content: `__FLAGS__${payload}`,
    status_flag: primaryFlag,
    recall_scheduled_for: recallIso,
    created_by: user.id,
  });

  if (insertError) {
    return { success: false, error: mapRemarkError(insertError.message, insertError.code) };
  }

  const { error: leadError } = await supabase
    .from("restaurants")
    .update({
      lead_status: parsed.data.status_flags[parsed.data.status_flags.length - 1],
      last_remarked_at: new Date().toISOString(),
      done_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      locked_by: null,
      lock_expires_at: null,
      next_recall_at: recallIso,
    })
    .eq("id", restaurantId);

  if (leadError) {
    return { success: false, error: mapRemarkError(leadError.message, leadError.code) };
  }

  revalidatePath("/");
  revalidatePath(`/leads/${restaurantId}`);
  return { success: true };
}
