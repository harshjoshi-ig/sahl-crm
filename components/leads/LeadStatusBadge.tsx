import type { RemarkFlag } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface LeadStatusBadgeProps {
  status: RemarkFlag | null;
}

const statusMap: Record<RemarkFlag, { label: string; variant: "blue" | "green" | "red" | "purple" }> = {
  call_again: { label: "Call Again", variant: "blue" },
  interested: { label: "Interested", variant: "green" },
  not_interested: { label: "Not Interested", variant: "red" },
  custom: { label: "Custom", variant: "purple" },
};

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  if (!status) {
    return <Badge variant="default">No Status</Badge>;
  }

  const config = statusMap[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
