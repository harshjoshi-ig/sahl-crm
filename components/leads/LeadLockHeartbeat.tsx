"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { heartbeatLeadLock } from "@/actions/leads";

interface LeadLockHeartbeatProps {
  leadId: string;
}

export function LeadLockHeartbeat({ leadId }: LeadLockHeartbeatProps) {
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!active) {
      return;
    }

    const timer = setInterval(() => {
      void heartbeatLeadLock(leadId).then((result) => {
        if (!result.success) {
          toast.message("Lead lock released.");
          setActive(false);
        }
      });
    }, 45000);

    return () => {
      clearInterval(timer);
    };
  }, [active, leadId]);

  return null;
}
