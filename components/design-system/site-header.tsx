"use client";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import { AccountIndicator } from "@/components/design-system/account-indicator";
import { BrandLogo } from "@/components/design-system/brand-logo";
import { CartIndicator } from "@/components/design-system/cart-indicator";
import { navItems } from "@/lib/content";

export function SiteHeader() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 12);
  });

  return (
    <motion.header
      animate={{ y: 0, opacity: 1 }}
      className={`fixed inset-x-0 top-0 z-50 border-b bg-canvas/90 backdrop-blur-sm transition-colors duration-500 ${
        isScrolled ? "border-hairline" : "border-transparent"
      }`}
      initial={{ y: -16, opacity: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <nav className="signature-container flex items-center justify-between py-5">
        <BrandLogo />
        <div className="hidden items-center gap-12 md:flex">
          {navItems.map((item) => (
            <a
              className="text-body text-graphite transition-colors duration-300 hover:text-ink"
              href={item.href}
              key={item.title}
            >
              {item.title}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <AccountIndicator />
          <CartIndicator />
        </div>
      </nav>
    </motion.header>
  );
}
