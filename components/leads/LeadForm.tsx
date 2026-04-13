"use client";

import { useMemo, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

import type { Lead } from "@/lib/types";
import { leadSchema, type LeadInput } from "@/lib/validations/lead";
import { createLead, updateLead } from "@/actions/leads";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LocationSelector = dynamic(
  () => import("@/components/location/LocationSelector").then((mod) => mod.LocationSelector),
  {
    ssr: false,
  },
);

interface LeadFormProps {
  mode: "create" | "update";
  leadId?: string;
  initialLead?: Lead;
}

export function LeadForm({ mode, leadId, initialLead }: LeadFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const defaults = useMemo<LeadInput>(() => {
    if (!initialLead) {
      return {
        name: "",
        phone_number: "",
        email: "",
        country: "",
        state: "",
        city: "",
        demo_sent: false,
        brochure_sent: false,
        meeting_scheduled_at: null,
      };
    }

    return {
      name: initialLead.name,
      phone_number: initialLead.phone_number ?? "",
      email: initialLead.email ?? "",
      country: initialLead.country,
      state: initialLead.state,
      city: initialLead.city,
      demo_sent: initialLead.demo_sent,
      brochure_sent: initialLead.brochure_sent,
      meeting_scheduled_at: initialLead.meeting_scheduled_at
        ? new Date(initialLead.meeting_scheduled_at)
        : null,
    };
  }, [initialLead]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: defaults,
  });

  const onSubmit = (values: LeadInput) => {
    startTransition(async () => {
      const result =
        mode === "create" ? await createLead(values) : await updateLead(leadId ?? "", values);

      if (!result.success) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }

      toast.success(mode === "create" ? "Lead created successfully" : "Lead updated successfully");
      if (mode === "create") {
        router.push("/");
      }
      router.refresh();
    });
  };

  const location = {
    country: watch("country") ?? "",
    state: watch("state") ?? "",
    city: watch("city") ?? "",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "Add New Lead" : "Lead Details"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Restaurant Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input id="phone_number" {...register("phone_number")} />
              {errors.phone_number && <p className="text-xs text-red-600">{errors.phone_number.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" {...register("email")} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            {mode === "create" ? (
              <Controller
                control={control}
                name="country"
                render={() => (
                  <LocationSelector
                    value={location}
                    onChange={(next) => {
                      setValue("country", next.country, { shouldValidate: true });
                      setValue("state", next.state, { shouldValidate: true });
                      setValue("city", next.city, { shouldValidate: true });
                    }}
                  />
                )}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" {...register("country")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" {...register("state")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register("city")} />
                </div>
              </div>
            )}
            {(errors.country || errors.state || errors.city) && (
              <p className="text-xs text-red-600">
                {errors.country?.message || errors.state?.message || errors.city?.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : mode === "create" ? "Create Lead" : "Update Lead Details"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
