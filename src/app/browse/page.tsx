import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/ui/logout-button";
import { getValidatedSession } from "@/lib/auth/validated-session";

export const metadata = {
  title: "Browse",
};

export default async function BrowsePage() {
  const session =
    await getValidatedSession();

  if (session.status === "anonymous") {
    redirect("/login");
  }

  if (session.status === "invalid") {
    redirect(
      "/api/auth/logout?reason=expired",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-200/50">
          Life of Priya Media
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Welcome, {session.user.name}
        </h1>

        <p className="mt-4 text-sm text-white/45">
          Your Jellyfin session is verified.
        </p>

        <LogoutButton />
      </div>
    </main>
  );
}