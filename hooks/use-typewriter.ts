"use client";

import { useState, useEffect, useRef } from "react";

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

  useEffect(() => {
    if (!isTyping || isComplete) return;

    const typeNext = () => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current += 1;
      } else {
        setIsComplete(true);
        setIsTyping(false);
      }
    };

    const timer = setTimeout(typeNext, speed);
    return () => clearTimeout(timer);
  }, [text, speed, isTyping, isComplete, displayedText]);

  return {
    displayedText,
    isComplete,
    isTyping,
    cursor: showCursor && !isComplete ? cursorChar : null,
  };
}
