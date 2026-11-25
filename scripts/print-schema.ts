/**
 * Writes the GraphQL schema (built in code with Pothos) to schema.graphql,
 * which GraphQL Codegen reads to type the frontend's queries.
 *
 *   npm run codegen
 */
import { writeFileSync } from "node:fs";
import { lexicographicSortSchema, printSchema } from "graphql";
import { schema } from "../src/graphql/schema";

writeFileSync("schema.graphql", printSchema(lexicographicSortSchema(schema)) + "\n");
console.log("Wrote schema.graphql");
