"use client";

import { useId, type FormEvent } from "react";
import { ChoiceField, FieldLabel, TextField } from "@/components/design-system/field";
import { type ContactDetails, QUOTE_REQUEST_LIMITS } from "@/features/quote-requests/quote-request-contract";
import { useMessages } from "@/lib/messages/locale-context";

type FieldsProps = {
  value: ContactDetails;
  onChange: (patch: Partial<ContactDetails>) => void;
};

/** A row of the form: two columns from `sm` up, one on phones. */
const row = "grid gap-x-10 gap-y-8 sm:col-span-2 sm:grid-cols-2";

/**
 * Required fields speak the page's language instead of the browser's: the
 * message shows when the form is sent and clears with the next keystroke.
 */
export function customValidity(message: string) {
  return {
    onInput: (event: FormEvent<HTMLInputElement>) => event.currentTarget.setCustomValidity(""),
    onInvalid: (event: FormEvent<HTMLInputElement>) => event.currentTarget.setCustomValidity(message)
  };
}

/** Salutation and title, above the name. The profile and the request form share these rows. */
export function SalutationFields({ onChange, value }: FieldsProps) {
  const messages = useMessages();
  const t = messages.contactDetails;
  const titleId = useId();
  return (
    <div className={row}>
      <ChoiceField
        emptyLabel={t.noAnswer}
        label={t.salutation}
        onChange={(salutation) => onChange({ salutation })}
        options={t.salutations}
        value={value.salutation}
      />
      <div>
        <FieldLabel hint={messages.account.optional} htmlFor={titleId}>
          {t.title}
        </FieldLabel>
        <TextField
          autoComplete="honorific-prefix"
          id={titleId}
          maxLength={QUOTE_REQUEST_LIMITS.titleMax}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder={t.titlePlaceholder}
          value={value.title}
        />
      </div>
    </div>
  );
}

/** How and when the person wants to be reached. "By phone" makes the phone field required. */
export function ReachFields({ onChange, value }: FieldsProps) {
  const t = useMessages().contactDetails;
  return (
    <div className={row}>
      <ChoiceField
        emptyLabel={t.noAnswer}
        label={t.channel}
        onChange={(contactChannel) => onChange({ contactChannel })}
        options={t.channels}
        value={value.contactChannel}
      />
      <ChoiceField
        emptyLabel={t.noAnswer}
        label={t.time}
        onChange={(contactTime) => onChange({ contactTime })}
        options={t.times}
        value={value.contactTime}
      />
    </div>
  );
}

/** Private or professional; professionals add their company (required) and field. */
export function CustomerTypeFields({ onChange, value }: FieldsProps) {
  const t = useMessages().contactDetails;
  const companyId = useId();
  const professional = value.customerType === "professional";
  return (
    <div className={row}>
      <ChoiceField
        emptyLabel={t.noAnswer}
        label={t.customerType}
        onChange={(customerType) => onChange({ customerType })}
        options={t.customerTypes}
        value={value.customerType}
      />
      {professional && (
        <>
          <div>
            <FieldLabel htmlFor={companyId}>{t.company}</FieldLabel>
            <TextField
              autoComplete="organization"
              id={companyId}
              maxLength={QUOTE_REQUEST_LIMITS.companyMax}
              onChange={(event) => onChange({ company: event.target.value })}
              required
              value={value.company}
              {...customValidity(t.companyForProfessionals)}
            />
          </div>
          <ChoiceField
            emptyLabel={t.noAnswer}
            label={t.role}
            onChange={(professionalRole) => onChange({ professionalRole })}
            options={t.roles}
            value={value.professionalRole}
          />
        </>
      )}
    </div>
  );
}
