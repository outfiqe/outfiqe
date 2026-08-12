"use client";

import type { ReactElement, ReactNode } from "react";

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

export const HeaderBar = ({
  children,
  condensed = false,
  className,
}: HeaderBarProps): ReactElement => (
  <header className={cx(wrapClass, condensed ? wrapCondensedClass : wrapExpandedClass)}>
    <div className={cx(barClass, condensed ? barCondensedClass : barExpandedClass, className)}>
      {children}
    </div>
  </header>
);
