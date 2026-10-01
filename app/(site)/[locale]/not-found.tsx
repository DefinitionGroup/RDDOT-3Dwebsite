import { AppHeader } from "@/components/design-system/app-header";
import { Pill } from "@/components/design-system/pill";

// German only until the functional copy is translated (sanity-pagebuilder Phase 9).
export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col bg-canvas px-5 py-6 text-ink sm:px-10 lg:px-[clamp(3rem,7vw,7rem)] lg:py-8">
      <AppHeader className="mx-auto w-full max-w-6xl" />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
        <h1 className="m-0 max-w-[14ch] text-balance text-heading-lg">
          Diese Seite gibt es <em>nicht</em>.
        </h1>
        <p className="m-0 max-w-[46ch] text-body text-graphite">
          Vielleicht wurde sie verschoben, oder der Link ist nicht mehr gültig.
        </p>
        <Pill href="/">Zur Startseite</Pill>
      </div>
    </main>
  );
}
