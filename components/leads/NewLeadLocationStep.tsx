"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LocationSelector } from "@/components/location/LocationSelector";

const locationStepSchema = z.object({
  country: z.string().min(1, "Country is required"),
  state: z.string().min(1, "State is required"),
  city: z.string().min(1, "City is required"),
});

type LocationStepInput = z.infer<typeof locationStepSchema>;

interface NewLeadLocationStepProps {
  initialValues?: Partial<LocationStepInput>;
}

export function NewLeadLocationStep({ initialValues }: NewLeadLocationStepProps) {
  const router = useRouter();

  const defaults = useMemo<LocationStepInput>(
    () => ({
      country: initialValues?.country ?? "",
      state: initialValues?.state ?? "",
      city: initialValues?.city ?? "",
    }),
    [initialValues],
  );

  const {
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<LocationStepInput>({
    resolver: zodResolver(locationStepSchema),
    defaultValues: defaults,
  });

  const location = {
    country: watch("country") ?? "",
    state: watch("state") ?? "",
    city: watch("city") ?? "",
  };

  const onNext = (values: LocationStepInput) => {
    const params = new URLSearchParams(values);
    router.push(`/leads/new/details?${params.toString()}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1: Select Location</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onNext)} className="space-y-5">
          <div className="space-y-2">
            <Label>Country / State / City</Label>
            <LocationSelector
              value={location}
              onChange={(next) => {
                setValue("country", next.country, { shouldValidate: true });
                setValue("state", next.state, { shouldValidate: true });
                setValue("city", next.city, { shouldValidate: true });
              }}
            />
            {(errors.country || errors.state || errors.city) && (
              <p className="text-xs text-red-600">
                {errors.country?.message || errors.state?.message || errors.city?.message}
              </p>
            )}
          </div>

          <Button type="submit">Next: Restaurant Details</Button>
        </form>
      </CardContent>
    </Card>
  );
}
