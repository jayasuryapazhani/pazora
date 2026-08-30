import {
  redirect,
} from "next/navigation";

import {
  LoginForm,
} from "@/components/ui/login-form";
import {
  getValidatedSession,
} from "@/lib/auth/validated-session";

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08080a] px-5 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(211,32,63,0.16),transparent_31%),radial-gradient(circle_at_80%_85%,rgba(211,32,63,0.05),transparent_26%)]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/55 to-transparent"
      />

      <div className="relative z-10 w-full">
        <div className="mx-auto flex justify-center">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}