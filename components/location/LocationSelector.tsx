"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

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

interface CountryRecord {
  name: string;
  isoCode: string;
}

interface StateRecord {
  name: string;
  isoCode: string;
}

interface CityRecord {
  name: string;
}

interface LocationDataset {
  countries: CountryRecord[];
  getStatesOfCountry: (countryIso: string) => StateRecord[];
  getCitiesOfState: (countryIso: string, stateIso: string) => CityRecord[];
}

const EMPTY_COUNTRIES: CountryRecord[] = [];
const EMPTY_STATES: StateRecord[] = [];
const EMPTY_CITIES: string[] = [];
const EMPTY_CITY_RECORDS: CityRecord[] = [];

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
  const [dataset, setDataset] = useState<LocationDataset | null>(null);

  useEffect(() => {
    let active = true;

    void import("country-state-city").then((module) => {
      if (!active) {
        return;
      }

      setDataset({
        countries: module.Country.getAllCountries(),
        getStatesOfCountry: module.State.getStatesOfCountry,
        getCitiesOfState: module.City.getCitiesOfState,
      });
    });

    return () => {
      active = false;
    };
  }, []);

  const countries = useMemo(() => dataset?.countries ?? EMPTY_COUNTRIES, [dataset]);
  const countryOptions = useMemo(() => countries.map((country) => country.name), [countries]);

  const selectedCountry = useMemo(
    () => countries.find((country) => country.name === value.country) ?? null,
    [countries, value.country],
  );

  const stateRecords = useMemo(() => {
    if (!selectedCountry) {
      return EMPTY_STATES;
    }

    return dataset?.getStatesOfCountry(selectedCountry.isoCode) ?? EMPTY_STATES;
  }, [dataset, selectedCountry]);

  const states = useMemo(() => {
    return stateRecords.map((state) => state.name);
  }, [stateRecords]);

  const selectedState = useMemo(() => {
    return stateRecords.find((state) => state.name === value.state) ?? null;
  }, [stateRecords, value.state]);

  const cities = useMemo(() => {
    if (!selectedCountry || !selectedState) {
      return EMPTY_CITIES;
    }

    return (dataset?.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode) ?? EMPTY_CITY_RECORDS).map((city) => city.name);
  }, [dataset, selectedCountry, selectedState]);

  const loading = dataset === null;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <ComboBox
        label="Country"
        value={value.country}
        placeholder={loading ? "Loading countries..." : "Select country"}
        options={countryOptions}
        disabled={loading}
        onSelect={(country) => onChange({ country, state: "", city: "" })}
      />
      <ComboBox
        label="State"
        value={value.state}
        placeholder={loading ? "Loading states..." : value.country ? "Select state" : "Select country first"}
        options={states}
        disabled={loading || !value.country}
        onSelect={(state) => onChange({ ...value, state, city: "" })}
      />
      <ComboBox
        label="City"
        value={value.city}
        placeholder={loading ? "Loading cities..." : value.state ? "Select city" : "Select state first"}
        options={cities}
        disabled={loading || !value.state}
        onSelect={(city) => onChange({ ...value, city })}
      />
    </div>
  );
}
