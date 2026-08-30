const jellyfinUrl = process.env.NEXT_PUBLIC_JELLYFIN_URL?.replace(/\/$/, "");

if (!jellyfinUrl) {
  throw new Error("NEXT_PUBLIC_JELLYFIN_URL is not configured.");
}

export const appConfig = {
  name: "Life of Priya Media",
  jellyfinUrl,
} as const;
