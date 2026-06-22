import type { DriveStep } from "driver.js";

// sessionStorage handoff key. The guide's "Replay the tour" button stashes this
// and routes to "/" (the new chat), where the chat input and full sidebar exist
// for the tour to target; replaying in place on the guide page would point steps
// at elements that aren't there. FirstRunTour reads it once it lands on "/".
export const REPLAY_TOUR_KEY = "knowsee:replay-tour";

// First-run product tour. Each step targets a real element by CSS selector, so
// the tour and the live UI cannot quietly drift apart: if a target is removed
// or renamed, the step visibly breaks rather than pointing at the wrong thing.
// Anchors are either dedicated `data-tour="..."` attributes or stable hrefs.
//
// KEEP IN SYNC: when a workspace page, nav entry, or major control changes,
// update these steps (and the guide at app/(chat)/guide) in the same change.

export const TOUR_STEPS: DriveStep[] = [
  {
    popover: {
      title: "Hello, I'm Knowsee",
      description:
        "Your brand's view of how the AI layer sees it. Ask about AI visibility, agentic commerce readiness, the digital shelf, or how you stack up against the competition, all in plain language. Ninety seconds and you'll know your way around. Skip whenever you like, nothing breaks.",
    },
  },
  {
    element: '[data-tour="chat-input"]',
    popover: {
      title: "Ask in plain language",
      description:
        "Name the brand, the market, the competitors you care about, and I'll do the legwork: fetch the live web, run the probes, and write the findings back as prose and charts. The more context you give, the sharper the answer.",
      side: "top",
      align: "center",
    },
  },
  {
    element: '[data-tour="new-chat"]',
    popover: {
      title: "Start fresh",
      description:
        "New brand, new question, new thread. Old chats stay in the sidebar so you can pick any of them back up where you left off.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: 'a[href="/guide"]',
    popover: {
      title: "The full guide",
      description:
        "Want more than ninety seconds? The guide has the full walk-through of what I do and how to ask, plus a button to replay this tour any time.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="feedback-nav"]',
    popover: {
      title: "Tell us what's off",
      description:
        "A bug, a rough edge, or a number that looks wrong? Send feedback lives right here. Every note reaches the team, and that is how Knowsee gets sharper.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-testid="user-nav-button"]',
    popover: {
      title: "Settings and your account",
      description:
        "Theme, account, and the rest live here. Set it once and forget it.",
      side: "top",
      align: "start",
    },
  },
];
