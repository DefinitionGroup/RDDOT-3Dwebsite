"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

type SignatureButtonProps = HTMLMotionProps<"a"> & {
  children: ReactNode;
  tone?: "solid" | "glass" | "light";
};

const toneClass = {
  solid: "bg-graphite text-porcelain hover:bg-ink",
  glass: "bg-white/12 text-white ring-1 ring-white/15 hover:bg-white/20",
  light: "bg-paper text-ink hover:bg-porcelain"
};

export function SignatureButton({
  children,
  className = "",
  tone = "solid",
  href = "#",
  ...props
}: SignatureButtonProps) {
  const iconSrc =
    tone === "light" ? "/images/icon-arrow-up-right-dark.svg" : "/images/icon-arrow-up-right.svg";

  return (
    <motion.a
      className={`group inline-flex min-h-10 items-center gap-3 px-4 py-3 text-[0.75rem] font-medium leading-none transition-colors duration-300 ease-signature ${toneClass[tone]} ${className}`}
      href={href}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      <span>{children}</span>
      <span className="relative size-3.5 overflow-hidden">
        <Image
          alt=""
          className="object-contain transition-transform duration-300 ease-signature group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          fill
          src={iconSrc}
        />
      </span>
    </motion.a>
  );
}
