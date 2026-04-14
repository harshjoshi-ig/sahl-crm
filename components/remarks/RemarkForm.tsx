"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { createRemark } from "@/actions/remarks";
import { REMARK_FLAGS } from "@/lib/types";
import { remarkSchema, type RemarkInput } from "@/lib/validations/remark";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface RemarkFormProps {
  restaurantId: string;
}

export function RemarkForm({ restaurantId }: RemarkFormProps) {
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
      recall_at: null,
    },
  });

  const onSubmit = (values: RemarkInput) => {
    startTransition(async () => {
      const result = await createRemark(
        restaurantId,
        values.content,
        values.status_flags,
        values.recall_at ? values.recall_at.toISOString() : null,
      );
      if (!result.success) {
        toast.error(result.error ?? "Failed to add remark");
        return;
      }

      toast.success("Remark added");
      reset({ content: "", status_flags: values.status_flags, recall_at: values.recall_at ?? null });
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

      <div className="space-y-2">
        <Label>Next Recall Date (optional)</Label>
        <Controller
          control={control}
          name="recall_at"
          render={({ field }) => (
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("w-[260px] justify-start text-left font-normal", !field.value && "text-zinc-500")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? format(field.value, "PPP") : "Set recall date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ?? undefined}
                    onSelect={(date) => field.onChange(date ?? null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button type="button" variant="ghost" onClick={() => field.onChange(null)} disabled={!field.value}>
                Clear
              </Button>
            </div>
          )}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Submitting..." : "Submit Remark"}
      </Button>
    </form>
  );
}
