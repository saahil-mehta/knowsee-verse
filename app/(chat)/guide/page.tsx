import {
  MessageSquare,
  Radar,
  ShoppingCart,
  Sparkles,
  Store,
} from "lucide-react";
import Link from "next/link";
import { ReplayTourButton } from "@/components/tour/replay-tour-button";
import { NAV_GROUPS } from "@/lib/nav/groups";

export const metadata = {
  title: "Guide",
};

const CAPABILITIES = [
  {
    icon: Radar,
    title: "AI visibility",
    body: "How the large language models describe your brand when someone asks. Where you show up, where a competitor does instead, and the gaps worth closing.",
  },
  {
    icon: ShoppingCart,
    title: "Agentic commerce readiness",
    body: "Whether an AI agent shopping on a customer's behalf can find, understand, and act on your product data, or quietly skips you for a rival that is easier to parse.",
  },
  {
    icon: Store,
    title: "The digital shelf",
    body: "Structured data, feeds, and the signals that decide whether you are legible to machines, not just to people.",
  },
  {
    icon: Sparkles,
    title: "Competitive benchmarking",
    body: "Every finding is relative. Scores are justified against the competitors you name, with the evidence that backs them.",
  },
];

const HOW_TO_ASK = [
  "Name the brand, and the market or region you care about.",
  "List the competitors worth comparing against, so the answer is relative, not abstract.",
  "Say what you are deciding, a launch, a fix, a pitch, and the answer will aim at that.",
  "Start a Brand Project when the work is ongoing; I will remember the context across chats.",
];

export default function GuidePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="space-y-3">
        <p className="font-mono text-[11px] text-foreground/45 uppercase tracking-[0.18em]">
          Guide
        </p>
        <h1 className="font-serif text-4xl tracking-tight">
          <span className="font-normal">Know</span>
          <span className="-ml-0.5 font-light italic opacity-70">see.</span>
        </h1>
        <p className="max-w-prose text-[15px] text-foreground/70 leading-relaxed">
          Your brand's view of how the AI layer sees it. Ask in plain language
          and I will fetch the live web, run the probes, and write the findings
          back as prose and charts. Here is what I do and how to get the
          sharpest answers out of me.
        </p>
        <div className="pt-2">
          <ReplayTourButton />
        </div>
      </header>

      <section className="mt-12">
        <h2 className="font-medium text-[13px] text-foreground/50 uppercase tracking-[0.14em]">
          What I look at
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {CAPABILITIES.map((c) => {
            const Icon = c.icon;
            return (
              <article
                className="rounded-2xl border border-border/60 bg-background p-5"
                key={c.title}
              >
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-8 items-center justify-center rounded-lg bg-foreground/[0.04] text-foreground/70">
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <h3 className="font-medium text-[14px] tracking-tight">
                    {c.title}
                  </h3>
                </div>
                <p className="mt-3 text-[13.5px] text-foreground/65 leading-relaxed">
                  {c.body}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-medium text-[13px] text-foreground/50 uppercase tracking-[0.14em]">
          How to ask
        </h2>
        <ul className="mt-5 space-y-3">
          {HOW_TO_ASK.map((tip) => (
            <li
              className="flex items-start gap-3 text-[14px] text-foreground/75 leading-relaxed"
              key={tip}
            >
              <MessageSquare
                className="mt-0.5 size-4 shrink-0 text-foreground/40"
                strokeWidth={1.75}
              />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-medium text-[13px] text-foreground/50 uppercase tracking-[0.14em]">
          Around the app
        </h2>
        <div className="mt-5 space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="font-medium text-[13px] text-foreground/70">
                {group.label}
              </p>
              <ul className="mt-3 space-y-2.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const content = (
                    <span className="flex items-start gap-3">
                      <Icon
                        className="mt-0.5 size-4 shrink-0 text-foreground/40"
                        strokeWidth={1.75}
                      />
                      <span>
                        <span className="font-medium text-[14px] text-foreground/85">
                          {item.label}
                        </span>
                        <span className="block text-[13px] text-foreground/55 leading-relaxed">
                          {item.description}
                        </span>
                      </span>
                    </span>
                  );
                  return (
                    <li key={item.label}>
                      {item.href ? (
                        <Link
                          className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-foreground/[0.03]"
                          href={item.href}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="px-2 py-1.5">{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
