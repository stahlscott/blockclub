"use client";

import Image from "next/image";
import { useState } from "react";

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  fallback?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fallback,
  className,
  style,
  priority = false,
}: OptimizedImageProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return <>{fallback}</> || null;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{ objectFit: "cover", ...style }}
      priority={priority}
      onError={() => setError(true)}
    />
  );
}
