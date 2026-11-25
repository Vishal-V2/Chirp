"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { getViewer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { displayNameSchema, fieldErrors, usernameSchema } from "@/lib/validation";

export type OnboardingState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: { displayName: string; username: string };
};

const schema = z.object({ displayName: displayNameSchema, username: usernameSchema });

export async function createProfile(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.profile) redirect("/");

  const values = {
    displayName: String(formData.get("displayName") ?? ""),
    username: String(formData.get("username") ?? "").replace(/^@/, ""),
  };
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const taken = await prisma.user.findFirst({
    where: { username: { equals: parsed.data.username, mode: "insensitive" } },
    select: { id: true },
  });
  if (taken) return { fieldErrors: { username: "That username is taken." }, values };

  try {
    await prisma.user.create({ data: { id: viewer.userId, ...parsed.data } });
  } catch (e) {
    // Someone grabbed the username between our check and the insert.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { username: "That username is taken." }, values };
    }
    throw e;
  }

  redirect("/");
}
