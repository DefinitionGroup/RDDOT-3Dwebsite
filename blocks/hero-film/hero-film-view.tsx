"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Emphasized } from "@/components/design-system/emphasized";
import { GlassBadge } from "@/components/design-system/glass";
import { Pill } from "@/components/design-system/pill";
import { SIGNATURE_EASE, STAGGER } from "@/lib/motion";

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

export type HeroFilmViewProps = {
  anchor?: string;
  eyebrow?: string;
  headline: string;
  summary?: string;
  primaryCta?: { label: string; href: string };
  filmButtonLabel?: string;
  badge?: string;
  film: {
    /** Large screens; also the fallback when no phone file exists. */
    desktop: string;
    mobile?: string;
    poster?: string;
  };
  /** Labels of the control that stops and restarts the loop. */
  playbackLabels: { pause: string; play: string };
};

function PlayGlyph() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="10" viewBox="0 0 10 10" width="10">
      <path d="M2 1l7 4-7 4z" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="10" viewBox="0 0 10 10" width="10">
      <path d="M2 1h2v8H2zM6 1h2v8H6z" />
    </svg>
  );
}

function PlayCircle() {
  return (
    <span className="inline-flex size-8 items-center justify-center rounded-pill border border-ink">
      <PlayGlyph />
    </span>
  );
}

/**
 * The film and one sentence. The loop plays silently under a gradient;
 * the page fades in from black once the first frame is there. People who
 * asked for less motion get the still, and the film only on request. A
 * round control beside the film button stops and restarts the loop, as a
 * moving picture that runs on its own must allow. The words rise in by CSS,
 * so they paint with the page instead of waiting for it to hydrate.
 */
export function HeroFilmView({
  anchor,
  badge,
  eyebrow,
  film,
  filmButtonLabel,
  headline,
  playbackLabels,
  primaryCta,
  summary
}: HeroFilmViewProps) {
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduceMotion) {
      setReady(true);
      return;
    }
    const timer = window.setTimeout(() => setReady(true), 1200);
    video.play().catch(() => {
      setReady(true);
      setPlaying(false);
    });
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setPlaying(false));
    else video.pause();
  }, []);

  const watchFilm = useCallback(() => {
    const video = videoRef.current as FullscreenVideo | null;
    if (!video) return;
    void video.play();
    if (video.requestFullscreen) {
      void video.requestFullscreen().catch(() => undefined);
    } else if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
    }
  }, []);

  const rise = (index: number) => ({ animationDelay: `${0.2 + index * STAGGER}s` });

  return (
    <section
      className="relative h-[100svh] max-h-[900px] min-h-[640px] overflow-hidden bg-canvas"
      id={anchor}
    >
      <video
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover object-[60%_center] md:object-center"
        loop
        muted
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onPlaying={() => setReady(true)}
        playsInline
        poster={film.poster}
        preload="metadata"
        ref={videoRef}
      >
        {film.mobile ? (
          <>
            <source media="(min-width: 768px)" src={film.desktop} type="video/mp4" />
            <source src={film.mobile} type="video/mp4" />
          </>
        ) : (
          <source src={film.desktop} type="video/mp4" />
        )}
      </video>
      <div aria-hidden="true" className="hero-shade absolute inset-0" />
      <motion.div
        animate={{ opacity: ready ? 0 : 1 }}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-canvas"
        initial={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: SIGNATURE_EASE }}
      />

      <div className="signature-container absolute inset-x-0 bottom-8 flex items-end justify-between gap-16 md:bottom-[72px]">
        <div className="flex max-w-[860px] flex-col gap-5 md:gap-7">
          {eyebrow && (
            <p
              className="m-0 animate-soft-reveal font-label text-label uppercase tracking-label text-graphite"
              style={rise(0)}
            >
              {eyebrow}
            </p>
          )}
          <h1 className="m-0 animate-soft-reveal text-balance text-display" style={rise(0)}>
            <Emphasized text={headline} />
          </h1>
          {summary && (
            <p className="m-0 max-w-[42ch] animate-soft-reveal text-body text-graphite md:text-lead" style={rise(1)}>
              {summary}
            </p>
          )}
          <div className="flex animate-soft-reveal flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3" style={rise(2)}>
            {primaryCta && (
              <Pill className="w-full sm:w-auto" href={primaryCta.href}>
                {primaryCta.label}
              </Pill>
            )}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {filmButtonLabel && (
                <Pill
                  className="h-12 min-w-0 flex-1 border-ink/70 pl-2 pr-[22px] font-base text-caption uppercase tracking-film sm:flex-none"
                  leading={<PlayCircle />}
                  onClick={watchFilm}
                  variant="secondary"
                >
                  {filmButtonLabel}
                </Pill>
              )}
              <button
                aria-label={playing ? playbackLabels.pause : playbackLabels.play}
                className="inline-flex size-12 shrink-0 items-center justify-center rounded-pill border border-ink/70 text-ink transition-[background-color,transform] duration-state ease-signature hover:bg-ink/10 active:scale-[0.96]"
                onClick={togglePlayback}
                title={playing ? playbackLabels.pause : playbackLabels.play}
                type="button"
              >
                {playing ? <PauseGlyph /> : <PlayGlyph />}
              </button>
            </div>
          </div>
        </div>
        {badge && (
          <div className="hidden animate-soft-reveal md:block" style={rise(3)}>
            <GlassBadge className="h-9 px-4">{badge}</GlassBadge>
          </div>
        )}
      </div>
    </section>
  );
}
