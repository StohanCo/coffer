import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { getDashboardData } from "@/server/services/dashboard";
import AppShell from "@/components/layout/AppShell";
import AppShellSkeleton from "@/components/layout/AppShellSkeleton";

async function DashboardContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/sign-in");

  const data = await getDashboardData(session.user.id);

  return (
    <AppShell
      user={{ email: session.user.email, name: session.user.name }}
      data={data}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
