"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { memo, useMemo } from "react";
import useSWR from "swr";
import type { BrandProfile } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { fetcher } from "@/lib/utils";
import { Suggestion } from "./elements/suggestion";
import { Skeleton } from "./ui/skeleton";
import type { VisibilityType } from "./visibility-selector";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
  projectId?: string;
};

const GENERIC_SUGGESTIONS = [
  "What are the biggest shifts in digital advertising this quarter?",
  "Write a client-ready campaign measurement framework",
  "Compare major DSPs for programmatic media buying",
  "Explain how AI is reshaping search and SEO strategy",
  "Draft a media plan template for a multi-channel campaign",
  "Compare multi-touch attribution vs. media mix modelling",
  "Write a new business pitch outline for a DTC brand",
  "Summarise the latest changes to Google's ad auction model",
];

function generateBrandSuggestions(profile: BrandProfile): string[] {
  const { brandName } = profile;
  const competitors = profile.competitors as string[];
  const categories = profile.categories as string[];
  const retailers = profile.retailers as string[];

  const suggestions: string[] = [
    `Run an AI visibility audit for ${brandName}`,
    `Run an agentic commerce audit for ${brandName}`,
    `Analyse ${brandName}'s structured data and schema.org readiness`,
    `Evaluate ${brandName}'s checkout flow for AI agent compatibility`,
    `Assess ${brandName}'s product page quality and pricing clarity`,
  ];

  if (competitors.length >= 2) {
    suggestions.push(
      `Compare ${brandName}'s mobile UX against ${competitors[0]} and ${competitors[1]}`
    );
  } else if (competitors.length === 1) {
    suggestions.push(
      `Compare ${brandName}'s mobile UX against ${competitors[0]}`
    );
  }

  if (categories.length > 0) {
    suggestions.push(
      `Research ${brandName}'s competitive position in ${categories[0]}`
    );
  }

  if (retailers.length >= 2) {
    suggestions.push(
      `Analyse ${retailers[0]} and ${retailers[1]}'s digital shelf for ${brandName}`
    );
  } else if (retailers.length === 1) {
    suggestions.push(
      `Analyse ${retailers[0]}'s digital shelf for ${brandName}`
    );
  }

  suggestions.push(
    `Review ${brandName}'s API surface and developer documentation`
  );

  return suggestions;
}

/**
 * Deterministic shuffle seeded by chatId — picks 4 suggestions
 * from the pool without depending on Math.random().
 */
function seededPick(items: string[], chatId: string, count: number): string[] {
  if (items.length <= count) {
    return items;
  }

  // Simple hash from chatId
  let hash = 0;
  for (let i = 0; i < chatId.length; i++) {
    hash = (hash * 31 + chatId.charCodeAt(i)) | 0;
  }

  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = (hash * 1_103_515_245 + 12_345) | 0;
    const j = (hash >>> 0) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

const SKELETON_KEYS = ["skel-0", "skel-1", "skel-2", "skel-3"];

function PureSuggestedActions({
  chatId,
  sendMessage,
  projectId,
}: SuggestedActionsProps) {
  const { data: brandProfile, isLoading } = useSWR<BrandProfile>(
    projectId ? `/api/project/${projectId}/brand-profile` : null,
    fetcher
  );

  const suggestions = useMemo(() => {
    if (!projectId) {
      return seededPick(GENERIC_SUGGESTIONS, chatId, 4);
    }
    if (!brandProfile) {
      return null;
    }
    const pool = generateBrandSuggestions(brandProfile);
    return seededPick(pool, chatId, 4);
  }, [projectId, brandProfile, chatId]);

  if (projectId && isLoading) {
    return (
      <div
        className="grid w-full gap-2 sm:grid-cols-2"
        data-testid="suggested-actions"
      >
        {SKELETON_KEYS.map((k) => (
          <Skeleton className="h-12 w-full rounded-full" key={k} />
        ))}
      </div>
    );
  }

  if (!suggestions) {
    return null;
  }

  return (
    <div
      className="grid w-full gap-2 sm:grid-cols-2"
      data-testid="suggested-actions"
    >
      {suggestions.map((suggestedAction, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
          key={suggestedAction}
          transition={{ delay: 0.05 * index }}
        >
          <Suggestion
            className="h-auto w-full whitespace-normal p-3 text-left"
            onClick={(suggestion) => {
              window.history.pushState({}, "", `/chat/${chatId}`);
              sendMessage({
                role: "user",
                parts: [{ type: "text", text: suggestion }],
              });
            }}
            suggestion={suggestedAction}
          >
            {suggestedAction}
          </Suggestion>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    if (prevProps.projectId !== nextProps.projectId) {
      return false;
    }

    return true;
  }
);
