import { z } from "zod";
import { REMARK_FLAGS } from "@/lib/types";

export const remarkSchema = z.object({
  content: z.string().trim().optional(),
  status_flags: z.array(z.enum(REMARK_FLAGS)).min(1, "Select at least one remark flag"),
});

export type RemarkInput = z.infer<typeof remarkSchema>;
