import {
  LoginForm,
} from "@/components/ui/login-form";

import {
  TvConnectApproval,
} from "@/components/ui/tv-connect-approval";

import {
  appConfig,
} from "@/lib/config";

import {
  getValidatedSession,
} from "@/lib/auth/validated-session";

export const metadata = {
  title: "Connect TV",
};

type TvConnectPageProps = {
  searchParams: Promise<{
    code?: string | string[];
  }>;
};

export default async function TvConnectPage({
  searchParams,
}: TvConnectPageProps) {
  const params =
    await searchParams;

  const rawCode =
    Array.isArray(params.code)
      ? params.code[0]
      : params.code;

  const code =
    rawCode?.trim() ?? "";

  const validCode =
    code.length > 0 &&
    code.length <= 32 &&
    /^[A-Za-z0-9-]+$/.test(
      code,
    );

  const session =
    validCode
      ? await getValidatedSession()
      : null;

  const returnTo =
    `/tv/connect?code=${encodeURIComponent(
      code,
    )}`;

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
        {!validCode ? (
          <div className="mx-auto w-full max-w-[420px] text-center">
            <p className="text-[2rem] font-bold tracking-[0.18em] text-[#d3203f]">
              {appConfig.wordmark}
            </p>

            <div className="mt-8 rounded-lg border border-red-500/20 bg-[#111114]/95 p-7">
              <h1 className="text-xl font-semibold text-white">
                Invalid TV connection
              </h1>

              <p className="mt-3 text-sm leading-6 text-white/45">
                Return to your TV and scan the current Pazora QR code again.
              </p>
            </div>
          </div>
        ) : session?.status ===
          "valid" ? (
          <div className="mx-auto flex justify-center">
            <TvConnectApproval
              code={code}
              userName={
                session.user.name
              }
            />
          </div>
        ) : (
          <div className="mx-auto flex justify-center">
            <LoginForm
              returnTo={
                returnTo
              }
            />
          </div>
        )}
      </div>
    </main>
  );
}