import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { getDashboardData } from "@/server/services/dashboard";
import AppShell from "@/components/layout/AppShell";

export default async function DashboardPage() {
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
