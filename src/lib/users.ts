import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/** Case-insensitive username lookup for page routing (404s, canonical URLs, titles). */
export const findUserByUsername = cache((username: string) =>
  prisma.user.findFirst({
    // Deactivated accounts read as "doesn't exist" (the name stays reserved).
    where: {
      username: { equals: username, mode: "insensitive" },
      deactivatedAt: null,
    },
    select: { id: true, username: true, displayName: true },
  }),
);
