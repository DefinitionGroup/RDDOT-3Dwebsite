import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ConfiguratorShell } from "@/features/configurator/ui/configurator-shell";
import { CONFIG_QUERY_PARAM, getInitialConfiguratorState } from "@/features/configurator/state-codec";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { projects } from "@/lib/server/projects/projects";
import { parseRevisionDisplaySnapshot } from "@/features/projects/revision-display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "3D Konfigurator | rotpunkt Signature",
  description: "Konfiguriere die erste rotpunkt Signature Küche als 3D-Prototyp."
};

type ConfigurePageProps = {
  searchParams: Promise<{
    [CONFIG_QUERY_PARAM]?: string | string[];
    project?: string | string[];
  }>;
};

export default async function ConfigurePage({ searchParams }: ConfigurePageProps) {
  const params = await searchParams;
  const projectId = typeof params.project === "string" ? params.project : null;

  if (projectId) {
    if (!z.uuid().safeParse(projectId).success) notFound();

    const session = await customerSessions.resolve(await headers());
    if (!session) {
      redirect(`/konto?next=${encodeURIComponent(`/configure?project=${projectId}`)}`);
    }

    const [workspace, revisionPage] = await Promise.all([
      projects.getWorkspace({
        ownerId: session.customerAccountId,
        projectId
      }),
      projects.listConfigurationRevisions({
        ownerId: session.customerAccountId,
        projectId,
        limit: 20
      })
    ]);
    if (!workspace) notFound();

    return (
      <ConfiguratorShell
        initialState={workspace.workingConfiguration.configuration}
        key={`${workspace.id}:${workspace.workingConfiguration.version}`}
        locale="de"
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
            : null
        }}
      />
    );
  }

  const initialState = getInitialConfiguratorState(params[CONFIG_QUERY_PARAM]);

  return <ConfiguratorShell initialState={initialState} locale="de" />;
}
