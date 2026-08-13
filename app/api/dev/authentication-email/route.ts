import { NextResponse } from "next/server";
import { z } from "zod";
import { findLatestDevelopmentEmailCapture } from "@/features/transactional-email/adapters/development-capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailSchema = z.email();

function unavailable() {
  return new NextResponse(null, { status: 404 });
}

export async function GET(request: Request) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.TRANSACTIONAL_EMAIL_PROVIDER !== "development-capture"
  ) {
    return unavailable();
  }

  const email = emailSchema.safeParse(
    new URL(request.url).searchParams.get("email")
  );
  if (!email.success) {
    return NextResponse.json(
      { error: "Eine gültige E-Mail-Adresse ist erforderlich." },
      { status: 400 }
    );
  }

  const capture = findLatestDevelopmentEmailCapture(email.data);
  const code = capture?.message.text.match(/\b\d{6}\b/)?.[0];
  if (!capture || !code) return unavailable();

  return NextResponse.json(
    {
      code,
      subject: capture.message.subject,
      capturedAt: capture.capturedAt.toISOString()
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    }
  );
}
