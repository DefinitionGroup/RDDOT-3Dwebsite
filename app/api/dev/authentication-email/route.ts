import { NextResponse } from "next/server";
import { z } from "zod";
import {
  extractOneTimeCode,
  isDevelopmentEmailCaptureActive
} from "@/features/transactional-email/adapters/development-capture";
import { getDatabase } from "@/lib/server/db/database";
import { createPostgresDevelopmentEmailCaptureStore } from "@/lib/server/db/development-email-capture-postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailSchema = z.email();

function unavailable() {
  return new NextResponse(null, { status: 404 });
}

export async function GET(request: Request) {
  if (!isDevelopmentEmailCaptureActive()) {
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

  const capture = await createPostgresDevelopmentEmailCaptureStore(
    getDatabase()
  ).findLatest(email.data);
  const code = capture ? extractOneTimeCode(capture) : null;
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
