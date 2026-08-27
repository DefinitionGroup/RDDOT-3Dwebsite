import { NextResponse } from "next/server";
import { z } from "zod";
import { SUPPORTED_PRODUCT_DEFINITION_VERSIONS } from "@/features/configurator/product-definition";
import { parseRevisionDisplaySnapshot } from "@/features/projects/revision-display";
import { sharing } from "@/lib/server/sharing/sharing";

export const runtime = "nodejs";

const resolveSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/)
});

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive"
};

export async function POST(
  request: Request,
  context: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await context.params;
  const body = resolveSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(linkId).success || !body.success) {
    return NextResponse.json(
      { error: "Dieser geteilte Stand ist nicht verfügbar." },
      { status: 404, headers: privateHeaders }
    );
  }

  const resolved = await sharing.resolveLink({ linkId, token: body.data.token });
  if (!resolved) {
    return NextResponse.json(
      { error: "Dieser geteilte Stand ist nicht mehr verfügbar." },
      { status: 404, headers: privateHeaders }
    );
  }
  // Allowlist check, not current-version equality: a supported-but-not-current
  // version must keep resolving, mirroring the restore path.
  if (
    !SUPPORTED_PRODUCT_DEFINITION_VERSIONS.includes(
      resolved.productDefinitionVersion
    )
  ) {
    return NextResponse.json(
      { error: "Diese historische Produktversion kann derzeit nicht angezeigt werden." },
      { status: 410, headers: privateHeaders }
    );
  }

  return NextResponse.json(
    {
      configuration: resolved.configuration,
      displaySnapshot: parseRevisionDisplaySnapshot(resolved.displaySnapshot),
      expiresAt: resolved.expiresAt.toISOString()
    },
    { headers: privateHeaders }
  );
}
