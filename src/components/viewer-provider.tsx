"use client";

import { createContext, useContext } from "react";
import type { ViewerProfile } from "@/lib/auth";

const ViewerContext = createContext<ViewerProfile | null>(null);

/** Makes the signed-in user's profile available to client components. */
export function ViewerProvider({
  viewer,
  children,
}: {
  viewer: ViewerProfile;
  children: React.ReactNode;
}) {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

/** The signed-in user, or null outside the app shell. */
export function useViewer() {
  return useContext(ViewerContext);
}
