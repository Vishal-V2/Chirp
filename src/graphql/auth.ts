import { GraphQLError } from "graphql";
import type { Context } from "./builder";

/** Throws UNAUTHENTICATED unless the request has a signed-in user. */
export function requireUser(ctx: Context): string {
  if (!ctx.userId) {
    throw new GraphQLError("You must be signed in.", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return ctx.userId;
}

export function badInput(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

export function notFound(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: "NOT_FOUND" } });
}
