import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
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
    <div className="h-screen overflow-hidden bg-zinc-50">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[auto_minmax(0,1fr)]">
        <DashboardSidebar />

        <div className="flex min-w-0 flex-col overflow-hidden">
          <header className="shrink-0 flex items-center justify-end border-b border-zinc-200 bg-white/95 px-8 py-4 backdrop-blur">
            <form action={signOut}>
              <Button variant="outline" className="gap-2">
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </form>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto px-8 py-8 xl:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
