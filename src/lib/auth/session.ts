export const sessionCookies = {
  accessToken: "lop_access_token",
  deviceId: "lop_device_id",
} as const;

export const legacySessionCookies = [
  "lop_user_id",
  "lop_user_name",
] as const;

export const sessionMaxAgeSeconds =
  60 * 60 * 24 * 30;

export const deviceMaxAgeSeconds =
  60 * 60 * 24 * 365;