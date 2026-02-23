"use client";

import { useEffect, useState } from "react";

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
  const [charIndex, setCharIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setCharIndex(0);
    setIsComplete(false);
    setIsTyping(false);

    const startTimer = setTimeout(() => {
      setIsTyping(true);
    }, startDelay);

    return () => clearTimeout(startTimer);
  }, [startDelay]);

  useEffect(() => {
    if (!isTyping || isComplete) {
      return;
    }

    const timer = setTimeout(() => {
      if (charIndex < text.length) {
        setCharIndex(charIndex + 1);
      } else {
        setIsComplete(true);
        setIsTyping(false);
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [text, speed, isTyping, isComplete, charIndex]);

  const displayedText = text.slice(0, charIndex);

  return {
    displayedText,
    isComplete,
    isTyping,
    cursor: showCursor && !isComplete ? cursorChar : null,
  };
}
