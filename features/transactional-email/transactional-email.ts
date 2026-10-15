import type { Locale } from "@/lib/i18n";

export type TransactionalEmailMessage = {
  recipient: string;
  template: {
    key: "authentication-otp";
    version: 1;
    locale: Locale;
  };
  subject: string;
  text: string;
  html: string;
  tags: Record<string, string>;
};

export type TransactionalEmailDelivery = {
  send(message: TransactionalEmailMessage): Promise<{
    providerMessageId: string;
  }>;
};
