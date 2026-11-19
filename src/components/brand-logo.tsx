import Image from "next/image";

import { cn } from "@/lib/utils";

type LogoVariant = "wordmark" | "full";
type LogoTone = "auto" | "light" | "dark";

interface BrandLogoProps {
  variant?: LogoVariant;
  tone?: LogoTone;
  className?: string;
  priority?: boolean;
  alt?: string;
}

const dimensions = {
  wordmark: { width: 1301, height: 160 },
  full: { width: 1305, height: 304 },
} as const;

export function BrandLogo({
  variant = "wordmark",
  tone = "auto",
  className,
  priority = false,
  alt = "Kuraishi Autohandel e.U.",
}: BrandLogoProps) {
  const { width, height } = dimensions[variant];
  const imageClassName = "h-auto w-full";

  if (tone !== "auto") {
    return (
      <Image
        src={`/images/brand/kuraishi-${variant}-${tone}.png`}
        width={width}
        height={height}
        sizes="(max-width: 640px) 9rem, 15rem"
        className={cn(imageClassName, className)}
        priority={priority}
        alt={alt}
      />
    );
  }

  return (
    <span className={cn("relative block", className)}>
      <Image
        src={`/images/brand/kuraishi-${variant}-light.png`}
        width={width}
        height={height}
        sizes="(max-width: 640px) 9rem, 15rem"
        className={`${imageClassName} brand-logo-light`}
        priority={priority}
        alt={alt}
      />
      <Image
        src={`/images/brand/kuraishi-${variant}-dark.png`}
        width={width}
        height={height}
        sizes="(max-width: 640px) 9rem, 15rem"
        className={`${imageClassName} brand-logo-dark`}
        priority={priority}
        alt=""
        aria-hidden="true"
      />
    </span>
  );
}
