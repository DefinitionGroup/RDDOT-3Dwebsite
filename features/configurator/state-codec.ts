import LZString from "lz-string";
import {
  DEFAULT_CONFIGURATOR_STATE,
  normalizeConfiguratorState
} from "@/features/configurator/product-definition";
import type { ConfiguratorState } from "@/features/configurator/types";

export const CONFIG_QUERY_PARAM = "c";

export function encodeConfiguration(state: ConfiguratorState) {
  const normalized = normalizeConfiguratorState(state);
  return LZString.compressToEncodedURIComponent(JSON.stringify(normalized));
}

export function decodeConfiguration(value?: string | string[] | null) {
  if (!value || Array.isArray(value)) {
    return null;
  }

  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(value);
    if (!decompressed) return null;
    return normalizeConfiguratorState(JSON.parse(decompressed) as Partial<ConfiguratorState>);
  } catch {
    return null;
  }
}

export function getInitialConfiguratorState(value?: string | string[] | null) {
  return decodeConfiguration(value) ?? DEFAULT_CONFIGURATOR_STATE;
}
