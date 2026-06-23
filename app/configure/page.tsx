import type { Metadata } from "next";
import { ConfiguratorShell } from "@/features/configurator/ui/configurator-shell";
import { CONFIG_QUERY_PARAM, getInitialConfiguratorState } from "@/features/configurator/state-codec";

export const metadata: Metadata = {
  title: "3D Konfigurator | rotpunkt Signature",
  description: "Konfiguriere die erste rotpunkt Signature Küche als 3D-Prototyp."
};

type ConfigurePageProps = {
  searchParams: Promise<{
    [CONFIG_QUERY_PARAM]?: string | string[];
  }>;
};

export default async function ConfigurePage({ searchParams }: ConfigurePageProps) {
  const params = await searchParams;
  const initialState = getInitialConfiguratorState(params[CONFIG_QUERY_PARAM]);

  return <ConfiguratorShell initialState={initialState} locale="de" />;
}
