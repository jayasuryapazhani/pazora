import { redirect } from "next/navigation";

import { getValidatedSession } from "@/lib/auth/validated-session";

export default async function Home() {
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

  redirect("/login");
}