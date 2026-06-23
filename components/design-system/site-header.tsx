"use client";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useRef, useState } from "react";
import { BrandLogo } from "@/components/design-system/brand-logo";
import { CartIndicator } from "@/components/design-system/cart-indicator";
import { navItems } from "@/lib/content";

export function SiteHeader() {
  const { scrollY } = useScroll();
  const [isHidden, setIsHidden] = useState(false);
  const hasObservedScroll = useRef(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? latest;

    if (!hasObservedScroll.current) {
      hasObservedScroll.current = true;
      return;
    }

    if (latest < 24) {
      setIsHidden(false);
      return;
    }

    if (latest > previous && latest > 120) {
      setIsHidden(true);
      return;
    }

    if (latest < previous) {
      setIsHidden(false);
    }
  });

  return (
    <motion.header
      animate={{ opacity: isHidden ? 0 : 1, y: isHidden ? "-115%" : 0 }}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-10 md:pt-6"
      initial={{ opacity: 0, y: -28 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <nav className="pointer-events-auto mx-auto flex max-w-[1540px] items-center justify-between bg-black/68 px-4 py-3 shadow-glass backdrop-blur-xl md:px-7 md:py-2.5">
        <BrandLogo tone="light" />
        <div className="hidden items-center gap-10 lg:flex">
          {navItems.map((item) => (
            <a
              className="group w-32 text-porcelain transition-colors duration-300 hover:text-white"
              href={item.href}
              key={item.title}
            >
              <span className="block text-[0.94rem] leading-[1.45]">{item.title}</span>
              <span className="mt-0.5 block text-[0.72rem] font-medium leading-tight opacity-78 transition-opacity group-hover:opacity-100">
                {item.description}
              </span>
            </a>
          ))}
        </div>
        <CartIndicator />
      </nav>
    </motion.header>
  );
}
