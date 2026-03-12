"use client";

import type { KeyboardEvent } from "react";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag || tag.length > 100 || value.length >= 20 || value.includes(tag)) {
      return;
    }
    onChange([...value, tag]);
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input.value);
      input.value = "";
    }

    if (e.key === "Backspace" && !input.value && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-2">
      {value.map((tag, i) => (
        <Badge className="gap-1" key={tag} variant="secondary">
          {tag}
          <button
            className="ml-0.5 rounded-full outline-none hover:bg-foreground/10"
            onClick={() => removeTag(i)}
            type="button"
          >
            &times;
          </button>
        </Badge>
      ))}
      <Input
        className="min-w-[120px] flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ""}
        ref={inputRef}
      />
    </div>
  );
}
