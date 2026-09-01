import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { AppHeader } from "@/components/design-system/app-header";
import { BrandLogo } from "@/components/design-system/brand-logo";
import { AccountAccess } from "@/features/customer-accounts/ui/account-access";
import { AccountWorkspace } from "@/features/customer-accounts/ui/account-workspace";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { loadInitialGallery } from "@/lib/server/photo-gallery/initial-gallery";
import { projects } from "@/lib/server/projects/projects";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mein Bereich | rotpunkt Signature",
  description: "Anmelden und private Küchenprojekte weiterplanen."
};

type AccountPageProps = {
  searchParams: Promise<{
    c?: string | string[];
    import?: string | string[];
    intent?: string | string[];
    next?: string | string[];
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;
  const session = await customerSessions.resolve(await headers());
  const [accountProjects, gallery] = session
    ? await Promise.all([
        projects.listProjects({ ownerId: session.customerAccountId }),
        loadInitialGallery({ ownerId: session.customerAccountId })
      ])
    : [[], { photos: [], totalCount: 0, nextCursor: null }];

  return (
    <main className="grid min-h-svh bg-canvas lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
      <section className="relative min-h-[31svh] overflow-hidden lg:min-h-svh">
        <Image
          alt=""
          className="object-cover object-center animate-soft-reveal lg:object-[58%_center]"
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 100vw"
          src="/images/signature-panorama.webp"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,18,16,0.12)_0%,rgba(20,18,16,0.06)_45%,rgba(20,18,16,0.62)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-paper sm:p-10 lg:p-14">
          <BrandLogo
            className="[&>span]:text-[clamp(1.7rem,3vw,2.8rem)]"
            href="/"
            tone="light"
          />
          <p className="mt-5 max-w-[34ch] text-base leading-7 text-white/86">
            Eine Küche entsteht nicht in einem Moment. Ihr Planungsstand wartet
            dort, wo Sie ihn verlassen haben.
          </p>
        </div>
      </section>

      <section className="flex min-h-[69svh] flex-col px-6 py-8 sm:px-10 lg:min-h-svh lg:px-[clamp(3rem,7vw,7rem)] lg:py-10">
        <AppHeader
          action={{ href: "/configure", label: "Zum Konfigurator" }}
          showAccount={false}
        />

        <div className="flex flex-1 items-center py-10">
        {session ? (
          <AccountWorkspace
            expiresAt={session.expiresAt.toISOString()}
            gallery={gallery}
            pendingImport={
              params.intent === "save" &&
              typeof params.c === "string" &&
              typeof params.import === "string"
                ? {
                    configurationCode: params.c,
                    idempotencyKey: params.import
                  }
                : null
            }
            projects={accountProjects.map((project) => ({
              ...project,
              updatedAt: project.updatedAt.toISOString()
            }))}
          />
        ) : (
          <AccountAccess
            returnTo={
              typeof params.next === "string" &&
              params.next.startsWith("/configure?project=")
                ? params.next
                : "/konto"
            }
          />
        )}
        </div>
      </section>
    </main>
  );
}
