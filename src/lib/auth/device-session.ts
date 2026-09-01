import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const deviceSessionAlgorithm =
  "aes-256-gcm";

const deviceSessionAad =
  Buffer.from(
    "pazora-device-session-v1",
    "utf8",
  );

const deviceSessionLifetimeSeconds =
  60 * 60 * 24 * 30;

export type DeviceSessionClaims = {
  version: 1;
  expiresAtEpochSeconds: number;
  accessToken: string;
  deviceId: string;
};

type DeviceSessionInput =
  Omit<
    DeviceSessionClaims,
    "version" |
    "expiresAtEpochSeconds"
  >;

function deviceSessionKey(): Buffer {
  const configured =
    process.env
      .PAZORA_PLAYBACK_GRANT_SECRET
      ?.trim();

  if (!configured) {
    throw new Error(
      "PAZORA_PLAYBACK_GRANT_SECRET is not configured.",
    );
  }

  const key =
    Buffer.from(
      configured,
      "base64url",
    );

  if (key.length !== 32) {
    throw new Error(
      "PAZORA_PLAYBACK_GRANT_SECRET must decode to exactly 32 bytes.",
    );
  }

  return key;
}

function encodePart(
  value: Buffer,
): string {
  return value.toString(
    "base64url",
  );
}

function decodePart(
  value: string,
): Buffer {
  return Buffer.from(
    value,
    "base64url",
  );
}

function nonEmptyString(
  value: unknown,
): string | null {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return null;
  }

  return value.trim();
}

function positiveInteger(
  value: unknown,
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    return null;
  }

  return value;
}

function parseClaims(
  value: unknown,
): DeviceSessionClaims {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Invalid Pazora device session.",
    );
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  if (record.version !== 1) {
    throw new Error(
      "Invalid Pazora device session version.",
    );
  }

  const expiresAt =
    positiveInteger(
      record.expiresAtEpochSeconds,
    );

  const accessToken =
    nonEmptyString(
      record.accessToken,
    );

  const deviceId =
    nonEmptyString(
      record.deviceId,
    );

  if (
    expiresAt === null ||
    !accessToken ||
    !deviceId
  ) {
    throw new Error(
      "Invalid Pazora device session claims.",
    );
  }

  const now =
    Math.floor(
      Date.now() / 1000,
    );

  if (expiresAt <= now) {
    throw new Error(
      "Pazora device session expired.",
    );
  }

  return {
    version: 1,
    expiresAtEpochSeconds:
      expiresAt,
    accessToken,
    deviceId,
  };
}

export function issueDeviceSession(
  input: DeviceSessionInput,
) {
  const now =
    Math.floor(
      Date.now() / 1000,
    );

  const claims:
    DeviceSessionClaims = {
      version: 1,
      expiresAtEpochSeconds:
        now +
        deviceSessionLifetimeSeconds,
      ...input,
    };

  const iv =
    randomBytes(12);

  const cipher =
    createCipheriv(
      deviceSessionAlgorithm,
      deviceSessionKey(),
      iv,
    );

  cipher.setAAD(
    deviceSessionAad,
  );

  const plaintext =
    Buffer.from(
      JSON.stringify(claims),
      "utf8",
    );

  const ciphertext =
    Buffer.concat([
      cipher.update(
        plaintext,
      ),
      cipher.final(),
    ]);

  const tag =
    cipher.getAuthTag();

  const token = [
    encodePart(iv),
    encodePart(ciphertext),
    encodePart(tag),
  ].join(".");

  return {
    token,
    expiresAt:
      new Date(
        claims
          .expiresAtEpochSeconds *
        1000,
      ).toISOString(),
  };
}

export function readDeviceSession(
  token: string,
): DeviceSessionClaims {
  if (
    token.length === 0 ||
    token.length > 16_384
  ) {
    throw new Error(
      "Invalid Pazora device session.",
    );
  }

  const parts =
    token.split(".");

  if (parts.length !== 3) {
    throw new Error(
      "Invalid Pazora device session.",
    );
  }

  const [
    ivPart,
    ciphertextPart,
    tagPart,
  ] = parts;

  const iv =
    decodePart(ivPart);

  const ciphertext =
    decodePart(
      ciphertextPart,
    );

  const tag =
    decodePart(tagPart);

  if (
    iv.length !== 12 ||
    tag.length !== 16 ||
    ciphertext.length === 0
  ) {
    throw new Error(
      "Invalid Pazora device session.",
    );
  }

  const decipher =
    createDecipheriv(
      deviceSessionAlgorithm,
      deviceSessionKey(),
      iv,
    );

  decipher.setAAD(
    deviceSessionAad,
  );

  decipher.setAuthTag(tag);

  const plaintext =
    Buffer.concat([
      decipher.update(
        ciphertext,
      ),
      decipher.final(),
    ]);

  const parsed: unknown =
    JSON.parse(
      plaintext.toString(
        "utf8",
      ),
    );

  return parseClaims(
    parsed,
  );
}
