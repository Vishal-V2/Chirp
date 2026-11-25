"use client";

import { useState } from "react";
import { Client, Provider, fetchExchange } from "urql";
import { graphcache } from "@/graphql/client/cache";

/** urql client for /api/graphql. Session cookies are sent automatically (same origin). */
export function GraphQLProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new Client({
        url: "/api/graphql",
        exchanges: [graphcache, fetchExchange],
        // Show cached data immediately, then refresh it in the background.
        requestPolicy: "cache-and-network",
      }),
  );
  return <Provider value={client}>{children}</Provider>;
}
