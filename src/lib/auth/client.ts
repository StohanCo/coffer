"use client";

import { createAuthClient } from "better-auth/react";

// Use the current page origin so auth calls always go to the right port,
// even when Next.js picks a non-3000 port in dev.
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
});

export const { signIn, signUp, signOut, useSession } = authClient;
