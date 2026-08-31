"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  HeaderSearch,
} from "@/components/layout/header-search";
import {
  appConfig,
} from "@/lib/config";

type AppHeaderProps = {
  userName: string;
};

export function AppHeader({
  userName,
}: AppHeaderProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const [scrolled, setScrolled] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [signingOut, setSigningOut] =
    useState(false);

  const [signOutError, setSignOutError] =
    useState<string | null>(null);

  useEffect(() => {
    function handleScroll() {
      setScrolled(
        window.scrollY > 42,
      );
    }

    handleScroll();

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      },
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll,
      );
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    setSignOutError(null);

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
      setSigningOut(false);

      setSignOutError(
        error instanceof Error
          ? error.message
          : "Unable to sign out.",
      );
    }
  }

  const avatarLetter =
    userName
      .trim()
      .charAt(0)
      .toUpperCase() || "P";

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 h-[var(--pazora-header-height)] transition-[background-color,box-shadow,backdrop-filter] duration-200",
        scrolled
          ? "bg-[#0a0a0c]/90 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl"
          : "bg-gradient-to-b from-black/70 via-black/30 to-transparent",
      ].join(" ")}
    >
      <div className="pazora-page-gutter flex h-full items-center gap-7">
        <Link
          href="/browse"
          prefetch={false}
          className="shrink-0 text-xl font-bold tracking-[0.18em] text-[#d3203f] transition hover:text-[#eb294b] sm:text-[1.35rem]"
          aria-label="Pazora home"
        >
          {appConfig.wordmark}
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-5 text-[13px] font-medium md:flex"
        >
          <Link
            href="/browse"
            prefetch={false}
            aria-current={
              pathname === "/browse"
                ? "page"
                : undefined
            }
            className={[
              "transition hover:text-white",
              pathname === "/browse"
                ? "text-white"
                : "text-white/65",
            ].join(" ")}
          >
            Home
          </Link>

          <Link
            href="/movies"
            prefetch={false}
            aria-current={
              pathname === "/movies"
                ? "page"
                : undefined
            }
            className={[
              "transition hover:text-white",
              pathname === "/movies"
                ? "text-white"
                : "text-white/65",
            ].join(" ")}
          >
            Movies
          </Link>

          <Link
            href="/tv"
            prefetch={false}
            aria-current={
              pathname === "/tv"
                ? "page"
                : undefined
            }
            className={[
              "transition hover:text-white",
              pathname === "/tv"
                ? "text-white"
                : "text-white/65",
            ].join(" ")}
          >
            TV Shows
          </Link>

          <Link
            href="/collections"
            prefetch={false}
            aria-current={
              pathname === "/collections"
                ? "page"
                : undefined
            }
            className={[
              "transition hover:text-white",
              pathname === "/collections"
                ? "text-white"
                : "text-white/65",
            ].join(" ")}
          >
            Collections
          </Link>

          <Link
            href="/my-list"
            prefetch={false}
            aria-current={
              pathname === "/my-list"
                ? "page"
                : undefined
            }
            className={[
              "transition hover:text-white",
              pathname === "/my-list"
                ? "text-white"
                : "text-white/65",
            ].join(" ")}
          >
            My List
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <HeaderSearch />

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(
                  (current) =>
                    !current,
                );
              }}
              aria-expanded={
                menuOpen
              }
              aria-haspopup="menu"
              aria-label="Open account menu"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#d3203f] to-[#711125] text-sm font-semibold text-white shadow-lg shadow-black/25 outline-none ring-offset-2 ring-offset-black transition hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {avatarLetter}
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-12 w-64 overflow-hidden rounded-lg border border-white/10 bg-[#151518]/98 shadow-[0_24px_80px_rgba(0,0,0,0.62)] backdrop-blur-2xl"
              >
                <div className="border-b border-white/[0.08] px-4 py-4">
                  <p className="truncate text-sm font-semibold text-white">
                    {userName}
                  </p>

                  <p className="mt-1 text-xs text-white/35">
                    Private Jellyfin
                    account
                  </p>
                </div>

                <div className="p-2">
                  <Link
                    href="/my-list"
                    prefetch={false}
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                    }}
                    className="block w-full rounded-md px-3 py-2.5 text-left text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    My List
                  </Link>

                  <div
                    aria-hidden="true"
                    className="my-1 border-t border-white/[0.06]"
                  />

                  <button
                    type="button"
                    role="menuitem"
                    disabled={
                      signingOut
                    }
                    onClick={() => {
                      void signOut();
                    }}
                    className="w-full rounded-md px-3 py-2.5 text-left text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {signingOut
                      ? "Signing out..."
                      : "Sign out"}
                  </button>

                  {signOutError ? (
                    <p className="px-3 pb-2 pt-1 text-xs text-red-300">
                      {signOutError}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}