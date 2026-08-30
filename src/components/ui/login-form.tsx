"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import type {
  JellyfinStatusResponse,
  LoginResponse,
} from "@/types/auth";

type LoginState = {
  loading: boolean;
  error: string | null;
};

export function LoginForm() {
  const router = useRouter();
  const [server, setServer] =
    useState<JellyfinStatusResponse | null>(null);

  const [state, setState] = useState<LoginState>({
    loading: false,
    error: null,
  });

  useEffect(() => {
    let active = true;

    async function loadServerStatus() {
      try {
        const response = await fetch(
          "/api/jellyfin/status",
          {
            cache: "no-store",
          },
        );

        const data =
          (await response.json()) as JellyfinStatusResponse;

        if (active) {
          setServer(data);
        }
      } catch {
        if (active) {
          setServer({
            online: false,
            error: "Unable to contact the media server.",
          });
        }
      }
    }

    void loadServerStatus();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setState({
      loading: true,
      error: null,
    });

    const form = new FormData(event.currentTarget);

    const username = String(
      form.get("username") ?? "",
    ).trim();

    const password = String(
      form.get("password") ?? "",
    );

    try {
      const response = await fetch(
        "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        },
      );

      const data = (await response.json()) as
        | LoginResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Unable to sign in.",
        );
      }

      router.push("/browse");
      router.refresh();
    } catch (error) {
      setState({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to sign in.",
      });
    }
  }

  const serverOnline = server?.online === true;

  return (
    <div className="w-full max-w-sm">
      <div className="mb-10 text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.35em] text-amber-200/55">
          Life of Priya
        </p>

        <h1 className="text-4xl font-semibold tracking-tight text-white">
          Media
        </h1>

        <p className="mt-3 text-sm text-white/45">
          Sign in to your personal streaming library.
        </p>
      </div>

      <div className="mb-5 flex items-center justify-center gap-2 text-xs">
        <span
          className={[
            "h-2 w-2 rounded-full",
            server === null
              ? "bg-white/25"
              : serverOnline
                ? "bg-emerald-400"
                : "bg-red-400",
          ].join(" ")}
        />

        <span className="text-white/45">
          {server === null
            ? "Checking media server…"
            : serverOnline
              ? `${server.serverName ?? "Media server"} online`
              : "Media server unavailable"}
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black"
      >
        <div>
          <label
            htmlFor="username"
            className="mb-2 block text-xs font-medium text-white/55"
          >
            Username
          </label>

          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            disabled={state.loading}
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/50"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-xs font-medium text-white/55"
          >
            Password
          </label>

          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            disabled={state.loading}
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/50"
          />
        </div>

        {state.error ? (
          <p className="text-sm text-red-300">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={
            state.loading ||
            server?.online === false
          }
          className="w-full rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state.loading
            ? "Signing in…"
            : "Sign in"}
        </button>
      </form>

      {serverOnline && server?.version ? (
        <p className="mt-5 text-center text-[11px] text-white/25">
          Jellyfin {server.version}
        </p>
      ) : null}
    </div>
  );
}
