"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GlassBadge } from "@/components/design-system/glass";
import { Pill } from "@/components/design-system/pill";
import { configureHref, heroFilm } from "@/lib/content";
import { DURATION, REVEAL_RISE, SIGNATURE_EASE, STAGGER } from "@/lib/motion";

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

function PlayCircle() {
  return (
    <span className="inline-flex size-8 items-center justify-center rounded-pill border border-ink">
      <svg aria-hidden="true" fill="currentColor" height="10" viewBox="0 0 10 10" width="10">
        <path d="M2 1l7 4-7 4z" />
      </svg>
    </span>
  );
}

/**
 * The film and one sentence. The loop plays silently under a gradient;
 * the page fades in from black once the first frame is there. People who
 * asked for less motion get the still, and the film only on request.
 */
export function SignatureHero() {
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduceMotion) {
      setReady(true);
      return;
    }
    const timer = window.setTimeout(() => setReady(true), 1200);
    video.play().catch(() => setReady(true));
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

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

  const rise = (index: number) => ({
    initial: { opacity: 0, y: REVEAL_RISE },
    animate: { opacity: 1, y: 0 },
    transition: { duration: DURATION.reveal, ease: SIGNATURE_EASE, delay: 0.2 + index * STAGGER }
  });

  return (
    <section
      className="relative h-[100svh] max-h-[900px] min-h-[640px] overflow-hidden bg-canvas"
      id="top"
    >
      <video
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover object-[60%_center] md:object-center"
        loop
        muted
        onPlaying={() => setReady(true)}
        playsInline
        poster={heroFilm.poster}
        preload="metadata"
        ref={videoRef}
      >
        {heroFilm.sources.map((source) => (
          <source key={source.src} media={source.media} src={source.src} type="video/mp4" />
        ))}
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
          <motion.p
            className="m-0 font-label text-label uppercase tracking-label text-graphite"
            {...rise(0)}
          >
            Premium Küchen
          </motion.p>
          <motion.h1 className="m-0 text-balance text-display" {...rise(0)}>
            Küchen, auf den <em>Punkt</em>.
          </motion.h1>
          <motion.p className="m-0 max-w-[42ch] text-body text-graphite md:text-lead" {...rise(1)}>
            Modulare Signature-Küchen: in 3D geplant, in Ihrem Raum gesehen, in Deutschland
            gefertigt.
          </motion.p>
          <motion.div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3" {...rise(2)}>
            <Pill className="w-full sm:w-auto" href={configureHref}>
              Küche konfigurieren
            </Pill>
            <Pill
              className="h-12 w-full border-ink/70 pl-2 pr-[22px] font-base text-caption uppercase tracking-film sm:w-auto"
              leading={<PlayCircle />}
              onClick={watchFilm}
              variant="secondary"
            >
              Den Film ansehen
            </Pill>
          </motion.div>
        </div>
        <motion.div className="hidden md:block" {...rise(3)}>
          <GlassBadge className="h-9 px-4">Gefertigt in Deutschland</GlassBadge>
        </motion.div>
      </div>
    </section>
  );
}
