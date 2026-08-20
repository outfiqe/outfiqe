"use client";

import { motion } from "framer-motion";
import { type ReactElement, type ReactNode, useEffect, useRef } from "react";

import { cx } from "./cx";
import {
  barClass,
  barCondensedClass,
  barExpandedClass,
  wrapClass,
  wrapCondensedClass,
  wrapExpandedClass,
} from "./styles";

export type HeaderBarProps = {
  readonly children: ReactNode;
  readonly condensed?: boolean;
  readonly className?: string;
};

const HEADER_HEIGHT_VAR = "--site-header-height";

const LAYOUT_TRANSITION = { type: "spring", stiffness: 420, damping: 42, mass: 0.6 } as const;

export const HeaderBar = ({
  children,
  condensed = false,
  className,
}: HeaderBarProps): ReactElement => {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    let pendingFrameId: number | null = null;
    let lastHeightPx = -1;

    const observer = new ResizeObserver(() => {
      if (pendingFrameId !== null) return;
      pendingFrameId = requestAnimationFrame(() => {
        pendingFrameId = null;
        const heightPx = header.getBoundingClientRect().height;
        if (heightPx === lastHeightPx) return;
        lastHeightPx = heightPx;
        document.documentElement.style.setProperty(HEADER_HEIGHT_VAR, `${heightPx}px`);
      });
    });
    observer.observe(header);
    return () => {
      observer.disconnect();
      if (pendingFrameId !== null) cancelAnimationFrame(pendingFrameId);
    };
  }, []);

  return (
    <motion.header
      ref={headerRef}
      layout
      transition={LAYOUT_TRANSITION}
      className={cx(wrapClass, condensed ? wrapCondensedClass : wrapExpandedClass)}
    >
      <motion.div
        layout
        transition={LAYOUT_TRANSITION}
        className={cx(barClass, condensed ? barCondensedClass : barExpandedClass, className)}
      >
        {children}
      </motion.div>
    </motion.header>
  );
};
