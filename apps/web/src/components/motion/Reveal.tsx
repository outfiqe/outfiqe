"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

const REVEAL_VIEWPORT = { once: true, amount: 0.3 } as const;
const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;
const REVEAL_OFFSET_PX = 16;
const REVEAL_DURATION_SECONDS = 0.5;

const REVEAL_TAG = {
  div: motion.div,
  header: motion.header,
  h1: motion.h1,
  h2: motion.h2,
} as const;

type RevealTag = keyof typeof REVEAL_TAG;

type RevealProps = {
  children: ReactNode;
  className?: string;
  as?: RevealTag;
  delaySeconds?: number;
};

export const Reveal = ({ children, className, as = "div", delaySeconds = 0 }: RevealProps) => {
  const shouldReduceMotion = useReducedMotion();
  const MotionTag = REVEAL_TAG[as];

  return (
    <MotionTag
      className={className}
      initial={shouldReduceMotion ? false : { opacity: 0, y: REVEAL_OFFSET_PX }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={REVEAL_VIEWPORT}
      transition={{ duration: REVEAL_DURATION_SECONDS, ease: REVEAL_EASE, delay: delaySeconds }}
    >
      {children}
    </MotionTag>
  );
};
