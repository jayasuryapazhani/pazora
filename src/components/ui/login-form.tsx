"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  appConfig,
} from "@/lib/config";
import type {
  JellyfinStatusResponse,
  LoginResponse,
} from "@/types/auth";

type LoginState = {
  loading: boolean;
  error: string | null;
};

export function LoginForm({
  returnTo = "/browse",
}: {
  returnTo?: string;
}) {
  const router = useRouter();

  const [server, setServer] =
    useState<JellyfinStatusResponse | null>(
      null,
    );

  const [state, setState] =
    useState<LoginState>({
      loading: false,
      error: null,
    });

  useEffect(() => {
    let active = true;

    async function loadServerStatus() {
      try {
        const response =
          await fetch(
            "/api/jellyfin/status",
            {
              cache: "no-store",
            },
          );

        const data =
          (await response.json()) as
            JellyfinStatusResponse;

        if (active) {
          setServer(data);
        }
      } catch {
        if (active) {
          setServer({
            online: false,
            error:
              "Unable to contact the media server.",
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

    const form =
      new FormData(event.currentTarget);

    const username =
      String(
        form.get("username") ?? "",
      ).trim();

    const password =
      String(
        form.get("password") ?? "",
      );

    try {
      const response =
        await fetch(
          "/api/auth/login",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              username,
              password,
            }),
          },
        );

      const data =
        (await response.json()) as
          | LoginResponse
          | {
              error?: string;
            };

      if (!response.ok) {
        throw new Error(
          "error" in data &&
            data.error
            ? data.error
            : "Unable to sign in.",
        );
      }

      router.push(returnTo);
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

  const serverOnline =
    server?.online === true;

  return (
    <div className="w-full max-w-[390px]">
      <div className="mb-10 text-center">
        <p className="text-[2rem] font-bold tracking-[0.18em] text-[#d3203f] sm:text-[2.25rem]">
          {appConfig.wordmark}
        </p>

        <h1 className="mt-8 text-[1.65rem] font-semibold tracking-tight text-white">
          Welcome back
        </h1>

        <p className="mt-2 text-sm leading-6 text-white/45">
          Sign in to your private library.
        </p>
      </div>

      <form
        method="post"
        action="/api/auth/login"
        onSubmit={handleSubmit}
        className="rounded-lg border border-white/[0.08] bg-[#111114]/90 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-7"
      >
        <div className="space-y-4">
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
              className="w-full rounded-md border border-white/10 bg-black/55 px-4 py-3.5 text-sm text-white outline-none transition duration-200 placeholder:text-white/20 focus:border-[#d3203f]/80 focus:ring-2 focus:ring-[#d3203f]/15 disabled:opacity-50"
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
              className="w-full rounded-md border border-white/10 bg-black/55 px-4 py-3.5 text-sm text-white outline-none transition duration-200 focus:border-[#d3203f]/80 focus:ring-2 focus:ring-[#d3203f]/15 disabled:opacity-50"
            />
          </div>
        </div>

        {state.error ? (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-500/20 bg-red-500/[0.08] px-3.5 py-3 text-sm text-red-200"
          >
            {state.error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={
            state.loading ||
            server?.online === false
          }
          className="mt-6 w-full rounded-md bg-[#d3203f] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/30 transition duration-200 hover:bg-[#eb294b] active:bg-[#b71934] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state.loading
            ? "Signing in…"
            : "Sign in"}
        </button>

        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-white/35">
          <span
            aria-hidden="true"
            className={[
              "h-1.5 w-1.5 rounded-full",
              server === null
                ? "bg-white/25"
                : serverOnline
                  ? "bg-emerald-400"
                  : "bg-red-400",
            ].join(" ")}
          />

          <span>
            {server === null
              ? "Checking server…"
              : serverOnline
                ? "Private server online"
                : "Media server unavailable"}
          </span>
        </div>
      </form>

      <p className="mt-6 text-center text-[11px] leading-5 text-white/20">
        Access is limited to authorized
        Jellyfin users.
      </p>
    </div>
  );
}