"use client";

import { type ReactElement, type ReactNode, useRef } from "react";

import { cx } from "./cx";
import {
  barClass,
  barCondensedClass,
  barExpandedClass,
  wrapClass,
  wrapCondensedClass,
  wrapExpandedClass,
} from "./styles";
import { useHeaderHeightVar } from "./useHeaderHeightVar";

export type HeaderBarProps = {
  readonly children: ReactNode;
  readonly condensed?: boolean;
  readonly className?: string;
};

export const HeaderBar = ({
  children,
  condensed = false,
  className,
}: HeaderBarProps): ReactElement => {
  const headerRef = useRef<HTMLElement>(null);

  useHeaderHeightVar(headerRef);

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
