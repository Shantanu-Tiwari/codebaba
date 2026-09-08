"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function isRedirect(error: unknown): boolean {
  return (
    Boolean(error && typeof error === "object") &&
    ((error as any).message === "NEXT_REDIRECT" ||
      (typeof (error as any).digest === "string" &&
        (error as any).digest.startsWith("NEXT_REDIRECT")))
  );
}

export const requireAuth = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      redirect("/login");
    }
    return session;
  } catch (error) {
    if (isRedirect(error)) {
      throw error;
    }
    console.error("Failed to retrieve session in requireAuth:", error);
    redirect("/login");
  }
};

export const requireUnauth = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (session) {
      redirect("/dashboard");
    }
    return session;
  } catch (error) {
    if (isRedirect(error)) {
      throw error;
    }
    console.error("Failed to retrieve session in requireUnauth:", error);
    return null;
  }
};