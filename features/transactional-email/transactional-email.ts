export type TransactionalEmailMessage = {
  recipient: string;
  template: {
    key: "authentication-otp";
    version: 1;
    locale: "de";
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
