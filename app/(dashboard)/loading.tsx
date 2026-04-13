import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <Skeleton className="mb-4 h-10 w-full" />
        <Skeleton className="mb-3 h-8 w-full" />
        <Skeleton className="mb-3 h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}
