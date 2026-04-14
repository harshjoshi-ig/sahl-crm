"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import {
  createLead,
  importAreaRestaurantLeads,
  searchAreaRestaurants,
} from "@/actions/leads";
import type { AreaRestaurantCandidate } from "@/lib/maps/googleMaps";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [searchQuery, setSearchQuery] = useState(`restaurants in ${city}`);
  const [maxResults, setMaxResults] = useState(100);
  const [candidates, setCandidates] = useState<AreaRestaurantCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const selectedRestaurants = useMemo(
    () => candidates.filter((item) => selectedIds.includes(item.id)),
    [candidates, selectedIds],
  );

  const handleAreaSearch = () => {
    startTransition(async () => {
      const result = await searchAreaRestaurants({
        country,
        state,
        city,
        query: searchQuery,
        maxResults,
      });

      if (!result.success || !result.data) {
        toast.error(result.error ?? "Search failed");
        return;
      }

      setCandidates(result.data);
      setSelectedIds(result.data.map((item) => item.id));
      toast.success(`Found ${result.data.length} restaurants`);
    });
  };

  const handleImportSelected = () => {
    startTransition(async () => {
      const result = await importAreaRestaurantLeads({
        country,
        state,
        city,
        restaurants: selectedRestaurants,
      });

      if (!result.success) {
        toast.error(result.error ?? "Import failed");
        return;
      }

      toast.success(`Imported ${result.importedCount ?? selectedRestaurants.length} leads`);
      router.push("/");
      router.refresh();
    });
  };

  const toggleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((current) => (current.includes(id) ? current : [...current, id]));
      return;
    }

    setSelectedIds((current) => current.filter((item) => item !== id));
  };

  return (
    <div className="space-y-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Import Leads From This Area</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_130px_auto]">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={`restaurants in ${city}`}
            />
            <Input
              type="number"
              min={5}
              max={1000}
              value={maxResults}
              onChange={(event) => {
                const parsed = Number(event.target.value || 100);
                const bounded = Math.min(Math.max(Number.isFinite(parsed) ? parsed : 100, 5), 1000);
                setMaxResults(bounded);
              }}
            />
            <Button type="button" onClick={handleAreaSearch} disabled={isPending}>
              {isPending ? "Searching..." : "Search Restaurants"}
            </Button>
          </div>

          {candidates.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-600">
                  {selectedIds.length} selected out of {candidates.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedIds(candidates.map((item) => item.id))}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedIds([])}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="max-h-80 space-y-2 overflow-auto pr-1">
                {candidates.map((item) => {
                  const checked = selectedIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-md border border-zinc-200 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">{item.name}</p>
                        <p className="text-xs text-zinc-500">{item.phone_number || "No phone"}</p>
                        {item.address ? <p className="truncate text-xs text-zinc-500">{item.address}</p> : null}
                      </div>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => toggleSelect(item.id, Boolean(next))}
                      />
                    </label>
                  );
                })}
              </div>

              <Button
                type="button"
                onClick={handleImportSelected}
                disabled={isPending || selectedRestaurants.length === 0}
              >
                {isPending ? "Importing..." : `Import Selected (${selectedRestaurants.length})`}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Search restaurants for {city}, {state}, {country}, then select and import as leads.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
