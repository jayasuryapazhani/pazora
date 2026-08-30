import { getJellyfinContext } from "@/lib/auth/jellyfin-context";

export type ValidatedSession =
  | {
      status: "anonymous";
    }
  | {
      status: "invalid";
    }
  | {
      status: "valid";
      user: {
        id: string;
        name: string;
      };
    };

export async function getValidatedSession(): Promise<ValidatedSession> {
  const context =
    await getJellyfinContext();

  if (context.status !== "valid") {
    return {
      status: context.status,
    };
  }

  return {
    status: "valid",
    user: context.user,
  };
}