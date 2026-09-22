"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

const STAGGER_VIEWPORT = { once: true, amount: 0.2 } as const;
const STAGGER_STEP_SECONDS = 0.08;
const ITEM_OFFSET_PX = 14;
const ITEM_DURATION_SECONDS = 0.45;
const ITEM_EASE = [0.16, 1, 0.3, 1] as const;

const STAGGER_TAG = { div: motion.div, ul: motion.ul, ol: motion.ol } as const;
const STAGGER_ITEM_TAG = { div: motion.div, li: motion.li } as const;

type StaggerTag = keyof typeof STAGGER_TAG;
type StaggerItemTag = keyof typeof STAGGER_ITEM_TAG;

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER_STEP_SECONDS } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: ITEM_OFFSET_PX },
  visible: { opacity: 1, y: 0, transition: { duration: ITEM_DURATION_SECONDS, ease: ITEM_EASE } },
};

const reducedItemVariants: Variants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};

type StaggerProps = {
  children: ReactNode;
  className?: string;
  as?: StaggerTag;
};

export const Stagger = ({ children, className, as = "div" }: StaggerProps) => {
  const MotionTag = STAGGER_TAG[as];
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={STAGGER_VIEWPORT}
      variants={containerVariants}
    >
      {children}
    </MotionTag>
  );
};

type StaggerItemProps = {
  children: ReactNode;
  className?: string;
  as?: StaggerItemTag;
};

export const StaggerItem = ({ children, className, as = "div" }: StaggerItemProps) => {
  const shouldReduceMotion = useReducedMotion();
  const MotionTag = STAGGER_ITEM_TAG[as];
  return (
    <MotionTag
      className={className}
      variants={shouldReduceMotion ? reducedItemVariants : itemVariants}
    >
      {children}
    </MotionTag>
  );
};
