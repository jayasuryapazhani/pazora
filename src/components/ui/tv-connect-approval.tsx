"use client";

import {
  useState,
} from "react";

export function TvConnectApproval({
  code,
  userName,
}: {
  code: string;
  userName: string;
}) {
  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    connected,
    setConnected,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  async function connectTv() {
    setLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/auth/device/quick-connect/authorize",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                code,
              }),
          },
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        data.success !== true
      ) {
        throw new Error(
          data.error ??
            "Unable to connect this TV.",
        );
      }

      setConnected(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to connect this TV.",
      );

      setLoading(false);
    }
  }

  if (connected) {
    return (
      <div className="w-full max-w-[420px] rounded-lg border border-emerald-400/20 bg-[#111114]/95 p-7 text-center shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/10 text-xl text-emerald-300">
          ✓
        </div>

        <h1 className="mt-5 text-2xl font-semibold text-white">
          TV connected
        </h1>

        <p className="mt-3 text-sm leading-6 text-white/45">
          Pazora is continuing automatically on your TV.
          You can close this page.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px] rounded-lg border border-white/[0.08] bg-[#111114]/95 p-7 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#d3203f]">
          Connect your TV
        </p>

        <h1 className="mt-4 text-2xl font-semibold text-white">
          Authorize Pazora
        </h1>

        <p className="mt-2 text-sm leading-6 text-white/45">
          Signed in as {userName}
        </p>
      </div>

      <div className="mt-7 rounded-md border border-white/10 bg-black/45 px-4 py-5 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/30">
          TV code
        </p>

        <p className="mt-2 text-3xl font-semibold tracking-[0.18em] text-white">
          {code}
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-md border border-red-500/20 bg-red-500/[0.08] px-3.5 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        disabled={loading}
        onClick={() => {
          void connectTv();
        }}
        className="mt-6 w-full rounded-md bg-[#d3203f] px-4 py-3.5 text-sm font-semibold text-white transition duration-200 hover:bg-[#eb294b] active:bg-[#b71934] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading
          ? "Connecting…"
          : "Connect TV"}
      </button>

      <p className="mt-5 text-center text-[11px] leading-5 text-white/25">
        Only connect a TV you recognize.
      </p>
    </div>
  );
}