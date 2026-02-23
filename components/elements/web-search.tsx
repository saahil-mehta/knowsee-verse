"use client";

import { ChevronDownIcon, GlobeIcon, LinkIcon } from "lucide-react";
import type { ComponentProps } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type DynamicToolState =
  | "input-streaming"
  | "input-available"
  | "output-streaming"
  | "output-available";

export type WebSearchOutput = Array<{
  type: "web_search_result";
  url: string;
  title: string | null;
  pageAge: string | null;
  encryptedContent: string;
}>;

// --- WebSearchCard ---

export type WebSearchCardProps = ComponentProps<typeof Collapsible>;

export const WebSearchCard = ({ className, ...props }: WebSearchCardProps) => (
  <Collapsible className={cn("not-prose my-1", className)} {...props} />
);

// --- WebSearchHeader ---

export type WebSearchHeaderProps = ComponentProps<typeof CollapsibleTrigger> & {
  query: string | undefined;
  resultCount: number | undefined;
  state: DynamicToolState;
};

const isLoading = (state: DynamicToolState) =>
  state === "input-streaming" ||
  state === "input-available" ||
  state === "output-streaming";

export const WebSearchHeader = ({
  className,
  query,
  resultCount,
  state,
  ...props
}: WebSearchHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      "group flex w-full cursor-pointer items-center gap-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground",
      className
    )}
    {...props}
  >
    <GlobeIcon
      className={cn(
        "size-4 shrink-0 transition-all duration-300",
        isLoading(state) && "animate-spin"
      )}
    />
    <span className="truncate text-sm">{query ?? "Searching the web..."}</span>
    {state === "output-available" && resultCount != null && (
      <span className="ml-auto shrink-0 text-muted-foreground/60 text-xs">
        {resultCount} result{resultCount !== 1 ? "s" : ""}
      </span>
    )}
    <ChevronDownIcon className="size-3 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
);

// --- WebSearchResults ---

export type WebSearchResultsProps = ComponentProps<typeof CollapsibleContent>;

export const WebSearchResults = ({
  className,
  children,
  ...props
}: WebSearchResultsProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 data-[state=open]:animate-in",
      className
    )}
    {...props}
  >
    <div className="mt-2 max-h-52 overflow-y-auto rounded-lg bg-muted/30 p-1">
      {children}
    </div>
  </CollapsibleContent>
);

// --- WebSearchResult ---

export type WebSearchResultProps = ComponentProps<"a"> & {
  title: string;
};

export const WebSearchResult = ({
  href,
  title,
  className,
  ...props
}: WebSearchResultProps) => {
  let hostname: string | undefined;
  try {
    hostname = href ? new URL(href).hostname : undefined;
  } catch {
    hostname = href;
  }

  return (
    <a
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-muted/50",
        className
      )}
      href={href}
      rel="noreferrer"
      target="_blank"
      {...props}
    >
      {hostname ? (
        // biome-ignore lint/performance/noImgElement: external favicon — Next Image requires remotePatterns config
        <img
          alt=""
          className="size-4 shrink-0 rounded-sm"
          src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
        />
      ) : (
        <GlobeIcon className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className="min-w-0 truncate text-sm">{title}</span>
      {hostname && (
        <span className="ml-auto shrink-0 text-muted-foreground/50 text-xs">
          {hostname}
        </span>
      )}
    </a>
  );
};

// --- WebFetchCard ---

export type WebFetchCardProps = ComponentProps<"div"> & {
  state: DynamicToolState;
  url: string | undefined;
};

export const WebFetchCard = ({
  className,
  state,
  url,
  ...props
}: WebFetchCardProps) => {
  let hostname: string | undefined;
  try {
    hostname = url ? new URL(url).hostname : undefined;
  } catch {
    hostname = url;
  }

  return (
    <div
      className={cn(
        "not-prose my-1 flex items-center gap-2 py-1.5 text-sm text-muted-foreground",
        className
      )}
      {...props}
    >
      <LinkIcon
        className={cn(
          "size-4 shrink-0 transition-all duration-300",
          isLoading(state) && "animate-spin"
        )}
      />
      <span className="truncate">
        {isLoading(state)
          ? `Fetching ${hostname ?? "page"}...`
          : `Fetched ${hostname ?? "page"}`}
      </span>
    </div>
  );
};
