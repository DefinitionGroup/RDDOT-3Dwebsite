"use client";

import { createContext, type ReactNode, useContext } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { getMessages } from "./index";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/**
 * The page's locale for client components, set once by the locale layout.
 * Server components read the locale from their route params instead.
 */
export function LocaleProvider({ children, locale }: { children: ReactNode; locale: Locale }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useMessages() {
  return getMessages(useLocale());
}
