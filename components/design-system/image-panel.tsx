"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { SignatureButton } from "@/components/design-system/button";

type ImagePanelProps = {
  alt: string;
  cta?: string;
  eyebrow?: string;
  image: string;
  priority?: boolean;
  title?: string;
};

export function ImagePanel({ alt, cta, eyebrow, image, priority = false, title }: ImagePanelProps) {
  return (
    <motion.figure
      className="relative isolate min-h-[28rem] overflow-hidden bg-ink"
      initial={{ opacity: 1, y: 28 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true, amount: 0.25 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <Image
        alt={alt}
        className="object-cover transition-transform duration-700 ease-signature hover:scale-[1.025]"
        fill
        priority={priority}
        sizes="(min-width: 1024px) 50vw, 100vw"
        src={image}
      />
      {title && (
        <figcaption className="glass-surface absolute bottom-6 left-6 max-w-[19rem] p-6 text-white md:bottom-8 md:left-8">
          <h3 className="font-brand text-[2rem] font-medium leading-none">{title}</h3>
          {eyebrow && (
            <p className="mt-4 max-w-28 text-[0.72rem] font-medium leading-tight text-porcelain">
              {eyebrow}
            </p>
          )}
          {cta && (
            <SignatureButton className="mt-4" href="#collections">
              {cta}
            </SignatureButton>
          )}
        </figcaption>
      )}
    </motion.figure>
  );
}
