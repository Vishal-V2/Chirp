import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/** Case-insensitive username lookup for page routing (404s, canonical URLs, titles). */
export const findUserByUsername = cache((username: string) =>
  prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true, username: true, displayName: true },
  }),
);
