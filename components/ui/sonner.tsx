"use client";

import { Toaster } from "sonner";

export function Sonner() {
  return (
    <Toaster
      position="top-right"
      richColors
      toastOptions={{
        className: "border border-zinc-200 bg-white text-zinc-900",
      }}
    />
  );
}
