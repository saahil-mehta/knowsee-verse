"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Chat page error:", error);
  }, [error]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        This chat encountered an error. You can try reloading, or go back to
        start a new conversation.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => reset()} variant="outline">
          Try again
        </Button>
        <Button onClick={() => router.push("/")}>Go home</Button>
      </div>
    </div>
  );
}
