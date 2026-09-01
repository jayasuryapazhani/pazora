import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const pairingAlgorithm =
  "aes-256-gcm";

const pairingAad =
  Buffer.from(
    "pazora-quick-connect-v1",
    "utf8",
  );

const pairingLifetimeSeconds =
  60 * 10;

export type QuickConnectPairingClaims = {
  version: 1;
  expiresAtEpochSeconds: number;
  secret: string;
  deviceId: string;
};

type QuickConnectPairingInput = {
  secret: string;
  deviceId: string;
};

function pairingKey(): Buffer {
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
): QuickConnectPairingClaims {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Invalid Pazora Quick Connect pairing.",
    );
  }

  const record =
    value as Record<string, unknown>;

  if (record.version !== 1) {
    throw new Error(
      "Invalid Pazora Quick Connect version.",
    );
  }

  const expiresAtEpochSeconds =
    positiveInteger(
      record.expiresAtEpochSeconds,
    );

  const secret =
    nonEmptyString(
      record.secret,
    );

  const deviceId =
    nonEmptyString(
      record.deviceId,
    );

  if (
    !expiresAtEpochSeconds ||
    !secret ||
    !deviceId
  ) {
    throw new Error(
      "Invalid Pazora Quick Connect pairing claims.",
    );
  }

  if (
    expiresAtEpochSeconds <=
    Math.floor(Date.now() / 1000)
  ) {
    throw new Error(
      "Pazora Quick Connect pairing expired.",
    );
  }

  return {
    version: 1,
    expiresAtEpochSeconds,
    secret,
    deviceId,
  };
}

export function issueQuickConnectPairing(
  input: QuickConnectPairingInput,
) {
  const expiresAtEpochSeconds =
    Math.floor(Date.now() / 1000) +
    pairingLifetimeSeconds;

  const claims:
    QuickConnectPairingClaims = {
      version: 1,
      expiresAtEpochSeconds,
      secret:
        input.secret,
      deviceId:
        input.deviceId,
    };

  const iv =
    randomBytes(12);

  const cipher =
    createCipheriv(
      pairingAlgorithm,
      pairingKey(),
      iv,
    );

  cipher.setAAD(
    pairingAad,
  );

  const ciphertext =
    Buffer.concat([
      cipher.update(
        JSON.stringify(claims),
        "utf8",
      ),
      cipher.final(),
    ]);

  const authenticationTag =
    cipher.getAuthTag();

  return {
    token: [
      iv.toString("base64url"),
      authenticationTag.toString(
        "base64url",
      ),
      ciphertext.toString(
        "base64url",
      ),
    ].join("."),
    expiresAt:
      new Date(
        expiresAtEpochSeconds *
          1000,
      ).toISOString(),
  };
}

export function readQuickConnectPairing(
  token: string,
): QuickConnectPairingClaims {
  const parts =
    token.split(".");

  if (parts.length !== 3) {
    throw new Error(
      "Invalid Pazora Quick Connect pairing.",
    );
  }

  const [
    ivPart,
    authenticationTagPart,
    ciphertextPart,
  ] = parts;

  const iv =
    Buffer.from(
      ivPart,
      "base64url",
    );

  const authenticationTag =
    Buffer.from(
      authenticationTagPart,
      "base64url",
    );

  const ciphertext =
    Buffer.from(
      ciphertextPart,
      "base64url",
    );

  if (
    iv.length !== 12 ||
    authenticationTag.length !== 16 ||
    ciphertext.length === 0
  ) {
    throw new Error(
      "Invalid Pazora Quick Connect pairing.",
    );
  }

  const decipher =
    createDecipheriv(
      pairingAlgorithm,
      pairingKey(),
      iv,
    );

  decipher.setAAD(
    pairingAad,
  );

  decipher.setAuthTag(
    authenticationTag,
  );

  const plaintext =
    Buffer.concat([
      decipher.update(
        ciphertext,
      ),
      decipher.final(),
    ]).toString("utf8");

  return parseClaims(
    JSON.parse(plaintext),
  );
}