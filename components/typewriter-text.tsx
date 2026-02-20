"use client";

import { useTypewriter } from "@/hooks/use-typewriter";
import { cn } from "@/lib/utils";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  startDelay?: number;
  showCursor?: boolean;
  className?: string;
}

function renderWithBranding(text: string): React.ReactNode {
  const lines = text.split("\n");

  return lines.map((line, lineIndex) => {
    const knowseeIndex = line.indexOf("Knowsee");

    let content: React.ReactNode;
    if (knowseeIndex === -1) {
      content = line;
    } else {
      const before = line.slice(0, knowseeIndex);
      const knowseeEnd = knowseeIndex + 7;
      const after = line.slice(knowseeEnd);

      const visibleKnowsee = line.slice(knowseeIndex, knowseeEnd);
      const knowVisible = visibleKnowsee.slice(0, 4);
      const seeVisible = visibleKnowsee.slice(4);

      content = (
        <>
          {before}
          {knowVisible && <span className="font-normal">{knowVisible}</span>}
          {seeVisible && (
            <span className="-ml-0.5 font-light italic opacity-70">{seeVisible}</span>
          )}
          {after}
        </>
      );
    }

    return (
      <span key={lineIndex}>
        {lineIndex > 0 && <br />}
        {content}
      </span>
    );
  });
}

export function TypewriterText({
  text,
  speed = 50,
  startDelay = 0,
  showCursor = true,
  className,
}: TypewriterTextProps) {
  const { displayedText, cursor } = useTypewriter({
    text,
    speed,
    startDelay,
    showCursor,
  });

  return (
    <span className={cn("inline", className)}>
      {renderWithBranding(displayedText)}
      {cursor && <span className="animate-blink ml-0.5 inline-block">{cursor}</span>}
    </span>
  );
}
