"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { animationConfig } from "@/config/animation.config";

export function AnimatedSection({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: animationConfig.duration.slow,
        ease: animationConfig.ease,
      }}
    >
      {children}
    </motion.div>
  );
}
