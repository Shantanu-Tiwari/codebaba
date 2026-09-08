"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background text-foreground">
      <div className="max-w-md space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred while rendering the page.
          {error.digest && (
            <span className="block mt-1 font-mono text-xs opacity-75">
              Error Digest: {error.digest}
            </span>
          )}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={() => reset()} variant="default">
            Try again
          </Button>
          <Button onClick={() => (window.location.href = "/login")} variant="outline">
            Go to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
