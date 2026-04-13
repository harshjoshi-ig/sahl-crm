import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "border-zinc-200 bg-zinc-100 text-zinc-700",
        blue: "border-blue-200 bg-blue-50 text-blue-700",
        green: "border-green-200 bg-green-50 text-green-700",
        red: "border-red-200 bg-red-50 text-red-700",
        purple: "border-purple-200 bg-purple-50 text-purple-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
