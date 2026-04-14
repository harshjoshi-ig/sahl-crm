export const REMARK_FLAGS = [
  "call_again",
  "interested",
  "not_interested",
  "custom",
] as const;

export type RemarkFlag = (typeof REMARK_FLAGS)[number];

export interface Lead {
  id: string;
  name: string;
  phone_number: string | null;
  email: string | null;
  country: string;
  state: string;
  city: string;
  demo_sent: boolean;
  brochure_sent: boolean;
  meeting_scheduled_at: string | null;
  next_recall_at: string | null;
  locked_by: string | null;
  locked_by_name?: string | null;
  lock_expires_at: string | null;
  done_until: string | null;
  last_remarked_at: string | null;
  lead_status: RemarkFlag | null;
  created_at: string;
  created_by: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Remark {
  id: string;
  restaurant_id: string;
  created_by: string;
  content: string;
  status_flag: RemarkFlag;
  recall_scheduled_for: string | null;
  created_at: string;
}

export interface RemarkWithProfile extends Remark {
  profiles: Pick<Profile, "full_name" | "avatar_url"> | null;
}

export interface DailyLeadLog {
  id: string;
  user_id: string;
  log_date: string;
  leads_taken_count: number;
  updated_at: string;
  profiles?: Pick<Profile, "full_name"> | null;
}
