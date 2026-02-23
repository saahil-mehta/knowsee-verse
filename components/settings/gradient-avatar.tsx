"use client";

import { CameraIcon } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface GradientAvatarProps {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  onImageChange?: (file: File) => void;
}

function generateGradient(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 60) % 360;
  const hue3 = (hue1 + 150) % 360;

  return [
    `radial-gradient(circle at 30% 30%, hsl(${hue1}, 85%, 65%) 0%, transparent 50%)`,
    `radial-gradient(circle at 70% 70%, hsl(${hue2}, 80%, 55%) 0%, transparent 50%)`,
    `radial-gradient(circle at 70% 20%, hsl(${hue3}, 75%, 60%) 0%, transparent 40%)`,
    `linear-gradient(135deg, hsl(${hue1}, 70%, 50%) 0%, hsl(${hue2}, 75%, 45%) 100%)`,
  ].join(", ");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-20 text-2xl",
};

export function GradientAvatar({
  name,
  image,
  size = "md",
  editable = false,
  onImageChange,
}: GradientAvatarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (editable && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageChange) {
      onImageChange(file);
    }
  };

  return (
    <button
      className={cn(
        "relative flex items-center justify-center rounded-full border-0 bg-transparent p-0 font-medium text-white select-none",
        sizeClasses[size],
        editable && "cursor-pointer"
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: image ? undefined : generateGradient(name),
      }}
      tabIndex={editable ? 0 : -1}
      type="button"
    >
      {image ? (
        <Image
          alt={name}
          className="size-full rounded-full object-cover"
          height={80}
          src={image}
          width={80}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}

      {editable && isHovered && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
          <CameraIcon className="size-5 text-white" />
        </div>
      )}

      {editable && (
        <input
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
      )}
    </button>
  );
}
