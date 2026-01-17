"use client";

import Image from "next/image";
import { useState, useCallback } from "react";
import styles from "./OptimizedImage.module.css";

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  fallback?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  /** Set to false to disable loading skeleton (default: true) */
  showLoadingState?: boolean;
  /** Additional class for the wrapper container */
  wrapperClassName?: string;
  /** Border radius for skeleton to match image shape */
  borderRadius?: string | number;
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
  showLoadingState = true,
  wrapperClassName,
  borderRadius,
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if image is already cached/loaded on mount
  const handleImageRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) {
      setIsLoading(false);
    }
  }, []);

  if (!src || error) {
    return fallback ?? null;
  }

  // If loading state is disabled, render simple image
  if (!showLoadingState) {
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

  // With loading state wrapper - grid stacks skeleton and image
  return (
    <div
      className={`${styles.wrapper} ${wrapperClassName || ""}`}
    >
      {isLoading && (
        <div
          className={styles.skeleton}
          style={{ borderRadius: borderRadius ?? "inherit" }}
        />
      )}
      <Image
        ref={handleImageRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`${className || ""} ${isLoading ? styles.imageHidden : styles.imageVisible}`}
        style={{ objectFit: "cover", ...style }}
        priority={priority}
        onLoad={() => setIsLoading(false)}
        onError={() => setError(true)}
      />
    </div>
  );
}
