"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createRemark } from "@/actions/remarks";
import { REMARK_FLAGS } from "@/lib/types";
import { remarkSchema, type RemarkInput } from "@/lib/validations/remark";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RemarkFormProps {
  restaurantId: string;
}

export function RemarkForm({ restaurantId }: RemarkFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RemarkInput>({
    resolver: zodResolver(remarkSchema),
    defaultValues: {
      content: "",
      status_flags: ["call_again"],
    },
  });

  const onSubmit = (values: RemarkInput) => {
    startTransition(async () => {
      const result = await createRemark(restaurantId, values.content, values.status_flags);
      if (!result.success) {
        toast.error(result.error ?? "Failed to add remark");
        return;
      }

      toast.success("Remark added");
      reset({ content: "", status_flags: values.status_flags });
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-zinc-900">Add Remark</h3>
      <div className="space-y-2">
        <Label>Remark Flags (Select one or more)</Label>
        <Controller
          control={control}
          name="status_flags"
          render={({ field }) => (
            <div className="grid gap-2 sm:grid-cols-2">
              {REMARK_FLAGS.map((flag) => {
                const checked = field.value?.includes(flag) ?? false;
                return (
                  <label
                    key={flag}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 p-3 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => {
                        const current = field.value ?? [];
                        if (next) {
                          field.onChange([...current, flag]);
                          return;
                        }

                        field.onChange(current.filter((item) => item !== flag));
                      }}
                    />
                    <span className="capitalize">{flag.replaceAll("_", " ")}</span>
                  </label>
                );
              })}
            </div>
          )}
        />
        {errors.status_flags && <p className="text-xs text-red-600">{errors.status_flags.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Custom Note (optional)</Label>
        <Textarea id="content" {...register("content")} placeholder="Optional: add extra context for this update..." />
        {errors.content && <p className="text-xs text-red-600">{errors.content.message}</p>}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Submitting..." : "Submit Remark"}
      </Button>
    </form>
  );
}
