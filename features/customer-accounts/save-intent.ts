import { CONFIG_QUERY_PARAM } from "@/features/configurator/state-codec";
import { localizePath, type Locale } from "@/lib/i18n";

/** A guest configuration that becomes a Project once its visitor is signed in. */
export type SaveIntent = {
  configurationCode: string;
  idempotencyKey: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

/** The account page that imports the configuration; sign-in returns here so the save survives it. */
export function saveIntentPath(locale: Locale, intent: SaveIntent) {
  const query = new URLSearchParams({
    intent: "save",
    import: intent.idempotencyKey,
    [CONFIG_QUERY_PARAM]: intent.configurationCode
  });
  return localizePath(locale, `/konto?${query.toString()}`);
}

export function readSaveIntent(params: SearchParams): SaveIntent | null {
  const configurationCode = params[CONFIG_QUERY_PARAM];
  const idempotencyKey = params.import;
  return params.intent === "save" &&
    typeof configurationCode === "string" &&
    typeof idempotencyKey === "string"
    ? { configurationCode, idempotencyKey }
    : null;
}
