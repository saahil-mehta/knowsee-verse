"use client";

import "driver.js/dist/driver.css";
import { type Driver, driver } from "driver.js";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { REPLAY_TOUR_KEY, TOUR_STEPS } from "@/lib/tour/steps";

export function FirstRunTour({ autoStart }: { autoStart: boolean }) {
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const pathname = usePathname();
  const startedRef = useRef(false);
  const driverRef = useRef<Driver | null>(null);

  const markSeen = useCallback(() => {
    // Best-effort: if this fails the tour simply reappears next session, which
    // is a minor annoyance, not worth surfacing to the user.
    fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasSeenTour: true }),
    }).catch(() => {
      // swallow
    });
  }, []);

  const start = useCallback(
    ({ persist }: { persist: boolean }) => {
      // The sidebar holds most tour targets; a brand-new user lands with it
      // collapsed, so open it before measuring element positions.
      if (isMobile) {
        setOpenMobile(true);
      } else {
        setOpen(true);
      }

      // Let the sidebar expansion paint before driver.js measures the DOM.
      window.setTimeout(() => {
        const instance = driver({
          showProgress: true,
          allowClose: true,
          overlayOpacity: 0.6,
          stagePadding: 6,
          stageRadius: 10,
          popoverClass: "knowsee-tour",
          nextBtnText: "Next",
          prevBtnText: "Back",
          doneBtnText: "Done",
          progressText: "{{current}} of {{total}}",
          steps: TOUR_STEPS,
          onDestroyed: () => {
            if (persist) {
              markSeen();
            }
            driverRef.current = null;
          },
        });
        driverRef.current = instance;
        instance.drive();
      }, 280);
    },
    [isMobile, setOpen, setOpenMobile, markSeen]
  );

  // Auto-start once per first-run user. startedRef guards against re-firing on
  // client navigations while the layout (and this component) stays mounted.
  useEffect(() => {
    if (autoStart && !startedRef.current) {
      startedRef.current = true;
      start({ persist: true });
    }
  }, [autoStart, start]);

  // On-demand replay: the guide's button stashes a flag and routes to "/", where
  // the chat input and full sidebar exist. We pick the flag up here once we land.
  // Does not flip the seen flag.
  useEffect(() => {
    if (pathname !== "/" || typeof window === "undefined") {
      return;
    }
    if (window.sessionStorage.getItem(REPLAY_TOUR_KEY) === "1") {
      window.sessionStorage.removeItem(REPLAY_TOUR_KEY);
      start({ persist: false });
    }
  }, [pathname, start]);

  // Tear down any live tour if the component unmounts.
  useEffect(() => () => driverRef.current?.destroy(), []);

  return null;
}
