"use client";

import Image from "next/image";
import { motion } from "motion/react";

type ImagePanelProps = {
  alt: string;
  image: string;
  caption?: string;
  priority?: boolean;
  ratio?: string;
};

export function ImagePanel({
  alt,
  image,
  caption,
  priority = false,
  ratio = "aspect-[4/3]"
}: ImagePanelProps) {
  return (
    <motion.figure
      className="m-0"
      initial={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true, amount: 0.2 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className={`relative overflow-hidden bg-mist ${ratio}`}>
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.06 }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, amount: 0.2 }}
          whileInView={{ scale: 1 }}
        >
          <Image
            alt={alt}
            className="object-cover"
            fill
            priority={priority}
            sizes="(min-width: 1024px) 60vw, 100vw"
            src={image}
          />
        </motion.div>
      </div>
      {caption && (
        <figcaption className="mt-3 text-body text-graphite">{caption}</figcaption>
      )}
    </motion.figure>
  );
}
