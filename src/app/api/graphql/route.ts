import { createYoga } from "graphql-yoga";
import { schema } from "@/graphql/schema";
import { getUserId } from "@/lib/supabase/server";
import type { Context } from "@/graphql/builder";

const yoga = createYoga<object, Context>({
  schema,
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response },
  graphiql: process.env.NODE_ENV !== "production",
  context: async () => ({ userId: await getUserId() }),
});

const handler = (request: Request) => yoga.handleRequest(request, {});

export { handler as GET, handler as POST, handler as OPTIONS };
