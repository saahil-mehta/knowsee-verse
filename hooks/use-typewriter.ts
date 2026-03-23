"use client";

import { useEffect, useRef, useState } from "react";

interface UseTypewriterOptions {
  text: string;
  speed?: number;
  startDelay?: number;
  showCursor?: boolean;
  cursorChar?: string;
}

interface UseTypewriterResult {
  displayedText: string;
  isComplete: boolean;
  isTyping: boolean;
  cursor: string | null;
}

export function useTypewriter({
  text,
  speed = 50,
  startDelay = 0,
  showCursor = true,
  cursorChar = "|",
}: UseTypewriterOptions): UseTypewriterResult {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const indexRef = useRef(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: text must trigger reset
  useEffect(() => {
    setDisplayedText("");
    setIsComplete(false);
    setIsTyping(false);
    indexRef.current = 0;

    const startTimer = setTimeout(() => {
      setIsTyping(true);
    }, startDelay);

    return () => clearTimeout(startTimer);
  }, [text, startDelay]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: displayedText drives tick scheduling
  useEffect(() => {
    if (!isTyping || isComplete) {
      return;
    }

    const timer = setTimeout(() => {
      if (indexRef.current < text.length) {
        indexRef.current += 1;
        setDisplayedText(text.slice(0, indexRef.current));
      } else {
        setIsComplete(true);
        setIsTyping(false);
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [text, speed, isTyping, isComplete, displayedText]);

  return {
    displayedText,
    isComplete,
    isTyping,
    cursor: showCursor && !isComplete ? cursorChar : null,
  };
}
