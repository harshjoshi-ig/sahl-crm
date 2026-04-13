"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { createLead } from "@/actions/leads";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const detailsStepSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone_number: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

type LeadCreateInput = z.infer<typeof detailsStepSchema>;

interface NewLeadDetailsStepProps {
  country: string;
  state: string;
  city: string;
}

export function NewLeadDetailsStep({ country, state, city }: NewLeadDetailsStepProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadCreateInput>({
    resolver: zodResolver(detailsStepSchema),
    defaultValues: {
      name: "",
      phone_number: "",
      email: "",
    },
  });

  const onSubmit = (values: LeadCreateInput) => {
    startTransition(async () => {
      const result = await createLead({
        ...values,
        country,
        state,
        city,
        demo_sent: false,
        brochure_sent: false,
        meeting_scheduled_at: null,
      });

      if (!result.success) {
        toast.error(result.error ?? "Failed to create lead");
        return;
      }

      toast.success("Lead created. Open it from dashboard to continue workflow.");
      router.push("/");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2: Restaurant Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
            <p>
              Selected location: {city}, {state}, {country}
            </p>
            <Link href="/leads/new/location" className="mt-1 inline-block text-zinc-900 underline">
              Change location
            </Link>
          </div>

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

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Lead"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/leads/new/location">Back</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
