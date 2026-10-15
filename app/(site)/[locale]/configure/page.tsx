import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ConfiguratorShell } from "@/features/configurator/ui/configurator-shell";
import { CONFIG_QUERY_PARAM, getInitialConfiguratorState } from "@/features/configurator/state-codec";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { loadInitialGallery } from "@/lib/server/photo-gallery/initial-gallery";
import { projects } from "@/lib/server/projects/projects";
import { normalizeConfiguratorState } from "@/features/configurator/product-definition";
import { parseRevisionDisplaySnapshot } from "@/features/projects/revision-display";
import { sharing } from "@/lib/server/sharing/sharing";
import { DEFAULT_LOCALE, localizePath } from "@/lib/i18n";
import { visibleLocale } from "@/lib/locale-gate";
import { getMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/configure">): Promise<Metadata> {
  const locale = (await visibleLocale((await params).locale)) ?? DEFAULT_LOCALE;
  const t = getMessages(locale).meta;
  // One address however the configuration in the query string differs.
  return {
    title: t.configureTitle,
    description: t.configureDescription,
    alternates: { canonical: localizePath(locale, "/configure") }
  };
}

type ConfigurePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    [CONFIG_QUERY_PARAM]?: string | string[];
    project?: string | string[];
  }>;
};

export default async function ConfigurePage({ params: routeParams, searchParams }: ConfigurePageProps) {
  const locale = await visibleLocale((await routeParams).locale);
  if (!locale) notFound();
  const params = await searchParams;
  const projectId = typeof params.project === "string" ? params.project : null;

  if (projectId) {
    if (!z.uuid().safeParse(projectId).success) notFound();

    const session = await customerSessions.resolve(await headers());
    if (!session) {
      const next = localizePath(locale, `/configure?project=${projectId}`);
      redirect(localizePath(locale, `/konto?next=${encodeURIComponent(next)}`));
    }

    const [workspace, revisionPage, shareLinks, gallery] = await Promise.all([
      projects.getWorkspace({
        ownerId: session.customerAccountId,
        projectId
      }),
      projects.listConfigurationRevisions({
        ownerId: session.customerAccountId,
        projectId,
        limit: 20
      }),
      sharing.listLinks({
        ownerId: session.customerAccountId,
        projectId
      }),
      loadInitialGallery({ ownerId: session.customerAccountId, projectId })
    ]);
    if (!workspace) notFound();

    return (
      <ConfiguratorShell
        initialState={normalizeConfiguratorState(workspace.workingConfiguration.configuration)}
        key={`${workspace.id}:${workspace.workingConfiguration.version}`}
        locale={locale}
        project={{
          id: workspace.id,
          name: workspace.name,
          updatedAt: workspace.workingConfiguration.updatedAt.toISOString(),
          version: workspace.workingConfiguration.version,
          revisions: revisionPage.items.map((revision) => ({
            ...revision,
            createdAt: revision.createdAt.toISOString(),
            displaySnapshot: parseRevisionDisplaySnapshot(
              revision.displaySnapshot
            )
          })),
          revisionTotalCount: revisionPage.totalCount,
          revisionNextCursor: revisionPage.nextCursor
            ? {
                createdAt: revisionPage.nextCursor.createdAt.toISOString(),
                id: revisionPage.nextCursor.id
              }
            : null,
          shareLinks: shareLinks.map((link) => ({
            id: link.id,
            revisionId: link.revisionId,
            createdAt: link.createdAt.toISOString(),
            expiresAt: link.expiresAt.toISOString(),
            revokedAt: link.revokedAt?.toISOString() ?? null
          })),
          gallery
        }}
      />
    );
  }

  const initialState = getInitialConfiguratorState(params[CONFIG_QUERY_PARAM]);
  // A signed-in person without a Project can still take a photo: the shell
  // creates the Project for them, so it needs to know they are signed in.
  const session = await customerSessions.resolve(await headers());

  return (
    <ConfiguratorShell initialState={initialState} locale={locale} signedIn={Boolean(session)} />
  );
}
