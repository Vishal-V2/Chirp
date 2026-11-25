import SchemaBuilder from "@pothos/core";
import PrismaPlugin from "@pothos/plugin-prisma";
import RelayPlugin from "@pothos/plugin-relay";
import { DateTimeResolver } from "graphql-scalars";
import type PrismaTypes from "@/generated/pothos-types";
import { getDatamodel } from "@/generated/pothos-types";
import { prisma } from "@/lib/prisma";

export interface Context {
  /** Supabase auth user id, or null for signed-out requests. */
  userId: string | null;
}

/**
 * Creates a fresh schema builder. A new one is made each time the schema is
 * assembled (see schema.ts), so dev hot-reload can't register types twice.
 */
export function createBuilder() {
  const builder = new SchemaBuilder<{
    PrismaTypes: PrismaTypes;
    Context: Context;
    Scalars: { DateTime: { Input: Date; Output: Date } };
    DefaultFieldNullability: false;
  }>({
    // Fields are non-null unless marked `nullable: true`, which keeps client types clean.
    defaultFieldNullability: false,
    plugins: [PrismaPlugin, RelayPlugin],
    prisma: {
      client: prisma,
      dmmf: getDatamodel(),
      filterConnectionTotalCount: true,
      onUnusedQuery: process.env.NODE_ENV === "production" ? null : "warn",
    },
    relay: {},
  });

  builder.addScalarType("DateTime", DateTimeResolver);
  builder.queryType({});
  builder.mutationType({});
  return builder;
}

export type Builder = ReturnType<typeof createBuilder>;
