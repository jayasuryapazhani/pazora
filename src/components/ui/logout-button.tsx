"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function logout() {
    setLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/auth/logout",
          {
            method: "POST",
          },
        );

      if (!response.ok) {
        throw new Error(
          "Unable to sign out.",
        );
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      setLoading(false);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign out.",
      );
    }
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={logout}
        disabled={loading}
        className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-white/60 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading
          ? "Signing out…"
          : "Sign out"}
      </button>

      {error ? (
        <p className="mt-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}