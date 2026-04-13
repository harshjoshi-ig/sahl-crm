import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, LayoutDashboard, LogOut, PlusCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const signOut = async () => {
    "use server";

    const actionClient = await createClient();
    await actionClient.auth.signOut();
    redirect("/login");
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[240px_1fr]">
        <aside className="border-r border-zinc-200 bg-white p-6">
          <div className="mb-8 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-zinc-900" />
            <span className="text-sm font-semibold text-zinc-900">Restaurant CRM</span>
          </div>
          <nav className="space-y-2">
            <Link href="/" className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
            <Link href="/leads/new" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100">
              <PlusCircle className="h-4 w-4" /> New Lead
            </Link>
          </nav>
        </aside>

        <div className="flex flex-col">
          <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
            <div>
              <h1 className="text-lg font-semibold text-zinc-900">Lead Dashboard</h1>
              <p className="text-xs text-zinc-500">Track outreach, meetings, and follow-up progress.</p>
            </div>
            <form action={signOut}>
              <Button variant="outline" className="gap-2">
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </form>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
