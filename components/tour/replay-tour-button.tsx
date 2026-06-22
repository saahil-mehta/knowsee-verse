"use client";

import { Compass } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { REPLAY_TOUR_KEY } from "@/lib/tour/steps";

export function ReplayTourButton() {
  const router = useRouter();

  return (
    <Button
      onClick={() => {
        // The tour targets the chat input and full sidebar, which live on the
        // new-chat page, not here. Stash a flag and route there; FirstRunTour
        // picks it up on arrival and starts.
        window.sessionStorage.setItem(REPLAY_TOUR_KEY, "1");
        router.push("/");
      }}
      type="button"
      variant="outline"
    >
      <Compass className="size-4" strokeWidth={1.75} />
      Replay the tour
    </Button>
  );
}
