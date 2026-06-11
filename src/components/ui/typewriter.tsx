"use client";

import { useState, useEffect, useRef } from "react";

interface TypewriterProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function Typewriter({ text, speed = 30, className, onComplete }: TypewriterProps) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);
  const completeRef = useRef(false);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed("");
    completeRef.current = false;

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        if (!completeRef.current) {
          completeRef.current = true;
          onComplete?.();
        }
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span className={className}>
      {displayed}
      {displayed.length < text.length && <span className="typewriter-cursor" />}
    </span>
  );
}
