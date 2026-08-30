import { redirect } from "next/navigation";

import { LoginForm } from "@/components/ui/login-form";
import { getValidatedSession } from "@/lib/auth/validated-session";

export const metadata = {
  title: "Sign In",
};

export default async function LoginPage() {
  const session =
    await getValidatedSession();

  if (session.status === "valid") {
    redirect("/browse");
  }

  if (session.status === "invalid") {
    redirect(
      "/api/auth/logout?reason=expired",
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(201,159,73,0.10),transparent_35%)]" />

      <div className="relative z-10 w-full">
        <div className="mx-auto flex justify-center">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}