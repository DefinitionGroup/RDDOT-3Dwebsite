import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SharedRevisionPage } from "@/features/sharing/ui/shared-revision-page";

export const metadata: Metadata = {
  title: "Geteilter Küchenstand | rotpunkt Signature",
  description: "Read-only Ansicht eines freigegebenen Küchenstands.",
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
    nocache: true
  }
};

export default async function SharePage({
  params
}: {
  params: Promise<{ linkId: string }>;
}) {
  const { linkId } = await params;
  if (!z.uuid().safeParse(linkId).success) notFound();
  return <SharedRevisionPage linkId={linkId} />;
}
