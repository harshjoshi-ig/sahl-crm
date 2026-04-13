"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { City, Country, State } from "country-state-city";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface LocationValue {
  country: string;
  state: string;
  city: string;
}

interface LocationSelectorProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
}

function ComboBox({
  label,
  value,
  options,
  disabled,
  placeholder,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  disabled?: boolean;
  placeholder: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between"
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => {
                      onSelect(option);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", value === option ? "opacity-100" : "opacity-0")}
                    />
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function LocationSelector({ value, onChange }: LocationSelectorProps) {
  const countries = useMemo(() => Country.getAllCountries(), []);
  const selectedCountry = countries.find((country) => country.name === value.country);

  const states = useMemo(() => {
    if (!selectedCountry) {
      return [] as string[];
    }

    return State.getStatesOfCountry(selectedCountry.isoCode).map((state) => state.name);
  }, [selectedCountry]);

  const selectedState = useMemo(() => {
    if (!selectedCountry) {
      return null;
    }

    return State.getStatesOfCountry(selectedCountry.isoCode).find((state) => state.name === value.state) ?? null;
  }, [selectedCountry, value.state]);

  const cities = useMemo(() => {
    if (!selectedCountry || !selectedState) {
      return [] as string[];
    }

    return City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode).map((city) => city.name);
  }, [selectedCountry, selectedState]);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <ComboBox
        label="Country"
        value={value.country}
        placeholder="Select country"
        options={countries.map((country) => country.name)}
        onSelect={(country) => onChange({ country, state: "", city: "" })}
      />
      <ComboBox
        label="State"
        value={value.state}
        placeholder={value.country ? "Select state" : "Select country first"}
        options={states}
        disabled={!value.country}
        onSelect={(state) => onChange({ ...value, state, city: "" })}
      />
      <ComboBox
        label="City"
        value={value.city}
        placeholder={value.state ? "Select city" : "Select state first"}
        options={cities}
        disabled={!value.state}
        onSelect={(city) => onChange({ ...value, city })}
      />
    </div>
  );
}
