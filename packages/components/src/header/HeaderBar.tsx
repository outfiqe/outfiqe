"use client";

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

export const HeaderBar = ({
  children,
  condensed = false,
  className,
}: HeaderBarProps): ReactElement => {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty(
        HEADER_HEIGHT_VAR,
        `${header.getBoundingClientRect().height}px`,
      );
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      ref={headerRef}
      className={cx(wrapClass, condensed ? wrapCondensedClass : wrapExpandedClass)}
    >
      <div className={cx(barClass, condensed ? barCondensedClass : barExpandedClass, className)}>
        {children}
      </div>
    </header>
  );
};
