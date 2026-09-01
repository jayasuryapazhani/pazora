import {
  NextRequest,
  NextResponse,
} from "next/server";

import * as QRCode from "qrcode";

import {
  getPublicOrigin,
} from "@/lib/http/public-origin";

export const dynamic =
  "force-dynamic";

export async function GET(
  request: NextRequest,
) {
  const code =
    request.nextUrl
      .searchParams
      .get("code")
      ?.trim();

  if (
    !code ||
    code.length > 32 ||
    !/^[A-Za-z0-9-]+$/.test(
      code,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid TV connection code.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  const publicOrigin =
    getPublicOrigin(
      request,
    );

  const connectUrl =
    new URL(
      "/tv/connect",
      publicOrigin,
    );

  connectUrl.searchParams.set(
    "code",
    code,
  );

  const png =
    await QRCode.toBuffer(
      connectUrl.toString(),
      {
        type:
          "png",
        width:
          512,
        margin:
          2,
        errorCorrectionLevel:
          "M",
      },
    );

  return new NextResponse(
    new Uint8Array(png),
    {
      status: 200,
      headers: {
        "Content-Type":
          "image/png",
        "Cache-Control":
          "private, no-store",
        "X-Content-Type-Options":
          "nosniff",
      },
    },
  );
}