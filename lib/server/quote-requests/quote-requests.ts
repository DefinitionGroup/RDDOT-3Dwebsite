import "server-only";

import { parseConfiguration } from "@/features/projects/configuration-contract";
import {
  createRevisionDisplaySnapshot,
  UnsupportedProductDefinitionVersionError
} from "@/features/projects/revision-display";
import { createPriceIndication } from "@/features/quote-requests/price-indication";
import { getDatabase } from "@/lib/server/db/database";
import {
  type ConfigurationDescriber,
  createPostgresQuoteRequestModule
} from "@/lib/server/db/quote-requests-postgres";

/**
 * Both halves of the record come from the pinned configuration only, under the
 * Product Definition version it was saved with. Client input never reaches
 * either; an unsupported version writes nothing.
 */
const describeConfiguration: ConfigurationDescriber = ({
  normalizedConfiguration,
  productDefinitionVersion,
  now
}) => {
  let configuration;
  try {
    configuration = parseConfiguration(normalizedConfiguration);
  } catch {
    return null;
  }
  try {
    return {
      displaySnapshot: createRevisionDisplaySnapshot(
        configuration,
        productDefinitionVersion
      ),
      priceIndication: createPriceIndication(
        configuration,
        productDefinitionVersion,
        now
      )
    };
  } catch (error) {
    if (error instanceof UnsupportedProductDefinitionVersionError) return null;
    throw error;
  }
};

export const quoteRequests = createPostgresQuoteRequestModule(getDatabase(), {
  describeConfiguration
});
