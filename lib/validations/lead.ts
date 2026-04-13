import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone_number: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  country: z.string().min(1, "Country is required"),
  state: z.string().min(1, "State is required"),
  city: z.string().min(1, "City is required"),
  demo_sent: z.boolean(),
  brochure_sent: z.boolean(),
  meeting_scheduled_at: z.date().nullable().optional(),
});

export type LeadInput = z.input<typeof leadSchema>;
