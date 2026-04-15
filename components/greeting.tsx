"use client";

import { useMemo } from "react";
import { useTypewriter } from "@/hooks/use-typewriter";
import { useSession } from "@/lib/auth-client";

const GREETINGS = [
  (name: string) => `${name} is back! The brief just got interesting.`,
  (name: string) => `${name} walks in. Deadlines tremble.`,
  (name: string) => `Alert: ${name} has entered the chat. Expect brilliance.`,
  (name: string) => `${name}! The pixels missed you.`,
  (name: string) => `${name} returns. Let's make something unreasonably good.`,
  (name: string) => `${name}! Quick, look busy.`,
  (name: string) =>
    `The creative director has arrived. What are we shipping, ${name}?`,
  (name: string) => `${name}'s here. Time to turn caffeine into campaigns.`,
  (name: string) => `${name} has logged on. The deck won't know what hit it.`,
  (name: string) => `Well well well, ${name}'s back with ideas.`,
  (name: string) => `${name} just walked in. Someone's about to get briefed.`,
  (name: string) => `${name}! The whiteboard awaits your genius.`,
  (name: string) => `Look alive — ${name}'s got that "let's ship it" energy.`,
  (name: string) => `${name} returns. The strategy just sharpened itself.`,
  (name: string) =>
    `${name}! Right on cue. There's work to ruin competitors' days.`,
  (name: string) => `${name}'s in the building. Concepts, brace yourselves.`,
];

function pickGreeting(name: string): string {
  const index = Math.floor(Math.random() * GREETINGS.length);
  return GREETINGS[index](name);
}

function KnowseeBranded({ text }: { text: string }) {
  const idx = text.indexOf("Knowsee");
  if (idx === -1) {
    return <>{text}</>;
  }

  const before = text.slice(0, idx);
  const after = text.slice(idx + 7);

  return (
    <>
      {before}
      <span className="font-serif">
        <span className="font-normal">Know</span>
        <span className="-ml-0.5 font-light italic opacity-70">see</span>
      </span>
      {after}
    </>
  );
}

export const Greeting = () => {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  const greeting = useMemo(() => pickGreeting(firstName), [firstName]);

  const { displayedText, cursor } = useTypewriter({
    text: greeting,
    speed: 35,
    startDelay: 200,
  });

  return (
    <div
      className="mt-4 flex size-full flex-col justify-center px-3 md:mt-16"
      key="overview"
    >
      <h1 className="font-serif text-3xl text-foreground md:text-4xl">
        <KnowseeBranded text={displayedText} />
        {cursor && (
          <span className="animate-blink ml-0.5 inline-block">{cursor}</span>
        )}
      </h1>
    </div>
  );
};
