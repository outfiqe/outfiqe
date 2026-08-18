"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  createContext,
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { cn } from "./cn";
import { Input } from "./input";

type SelectHandler = () => void;

type AutocompleteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
  activeValue: string | null;
  setActiveValue: (value: string | null) => void;
  autoHighlightFirst: boolean;
  listboxId: string;
  getItemId: (value: string) => string;
  registerSelectHandler: (value: string, handler: SelectHandler) => () => void;
  runSelectHandler: (value: string) => void;
};

const AutocompleteContext = createContext<AutocompleteContextValue | null>(null);

const useAutocompleteContext = (component: string) => {
  const context = useContext(AutocompleteContext);
  if (!context) throw new Error(`<${component}> must be rendered inside <Autocomplete>`);
  return context;
};

const getOptionElements = (content: HTMLDivElement | null) =>
  content
    ? Array.from(
        content.querySelectorAll<HTMLElement>('[role="option"]:not([data-disabled="true"])'),
      )
    : [];

type AutocompleteProps = {
  children: ReactNode;
  closeOnSelect?: boolean;
  autoHighlightFirst?: boolean;
};

export const Autocomplete = ({
  children,
  closeOnSelect = true,
  autoHighlightFirst = true,
}: AutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const selectHandlersRef = useRef(new Map<string, SelectHandler>());
  const listboxId = useId();

  const registerSelectHandler = (value: string, handler: SelectHandler) => {
    selectHandlersRef.current.set(value, handler);
    return () => {
      selectHandlersRef.current.delete(value);
    };
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <AutocompleteContext.Provider
        value={{
          open,
          setOpen,
          contentRef,
          activeValue,
          setActiveValue,
          autoHighlightFirst,
          listboxId,
          getItemId: (value) => `${listboxId}-${value}`,
          registerSelectHandler,
          runSelectHandler: (value) => {
            selectHandlersRef.current.get(value)?.();
            if (closeOnSelect) setOpen(false);
          },
        }}
      >
        {children}
      </AutocompleteContext.Provider>
    </PopoverPrimitive.Root>
  );
};

type AutocompleteInputProps = React.ComponentPropsWithoutRef<typeof Input>;

export const AutocompleteInput = forwardRef<HTMLInputElement, AutocompleteInputProps>(
  ({ className, onKeyDown, onFocus, onChange, ...props }, ref) => {
    const {
      open,
      setOpen,
      contentRef,
      activeValue,
      setActiveValue,
      listboxId,
      getItemId,
      runSelectHandler,
    } = useAutocompleteContext("AutocompleteInput");

    const moveActive = (direction: 1 | -1) => {
      const options = getOptionElements(contentRef.current);
      if (options.length === 0) return;
      const currentIndex = options.findIndex((option) => option.dataset.value === activeValue);
      const nextIndex =
        currentIndex === -1
          ? direction === 1
            ? 0
            : options.length - 1
          : (currentIndex + direction + options.length) % options.length;
      const next = options.at(nextIndex);
      if (!next) return;
      setActiveValue(next.dataset.value ?? null);
      next.scrollIntoView({ block: "nearest" });
    };

    const jumpActive = (edge: "first" | "last") => {
      const options = getOptionElements(contentRef.current);
      const target = edge === "first" ? options.at(0) : options.at(-1);
      if (!target) return;
      setActiveValue(target.dataset.value ?? null);
      target.scrollIntoView({ block: "nearest" });
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setOpen(true);
          moveActive(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          setOpen(true);
          moveActive(-1);
          break;
        case "Home":
          if (!open) break;
          event.preventDefault();
          jumpActive("first");
          break;
        case "End":
          if (!open) break;
          event.preventDefault();
          jumpActive("last");
          break;
        case "Enter":
          if (activeValue) {
            event.preventDefault();
            runSelectHandler(activeValue);
          }
          break;
        case "Escape":
          if (open) {
            event.preventDefault();
            setOpen(false);
          }
          break;
        default:
          break;
      }
    };

    return (
      <PopoverPrimitive.Anchor asChild>
        <Input
          {...props}
          ref={ref}
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeValue ? getItemId(activeValue) : undefined}
          className={className}
          onFocus={(event) => {
            onFocus?.(event);
            setOpen(true);
          }}
          onChange={(event) => {
            onChange?.(event);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
      </PopoverPrimitive.Anchor>
    );
  },
);
AutocompleteInput.displayName = "AutocompleteInput";

type AutocompleteContentProps = React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>;

export const AutocompleteContent = ({
  className,
  children,
  ...props
}: AutocompleteContentProps) => {
  const { contentRef, listboxId, activeValue, setActiveValue, autoHighlightFirst } =
    useAutocompleteContext("AutocompleteContent");

  // Keeps the highlighted option in sync as results load or the filter narrows the list —
  // without this, arrow-key nav and Enter would target an option that already scrolled away.
  useEffect(() => {
    const options = getOptionElements(contentRef.current);
    if (options.length === 0) {
      if (activeValue !== null) setActiveValue(null);
      return;
    }
    if (options.some((option) => option.dataset.value === activeValue)) return;
    setActiveValue(autoHighlightFirst ? (options.at(0)?.dataset.value ?? null) : null);
  });

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={contentRef}
        id={listboxId}
        role="listbox"
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={cn(
          "z-50 max-h-72 w-[var(--radix-popover-trigger-width)] overflow-y-auto rounded-lg border border-border bg-card p-1.5 shadow-lg",
          className,
        )}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
};

type AutocompleteItemProps = {
  value: string;
  disabled?: boolean;
  onSelect: () => void;
  className?: string;
  children: ReactNode;
};

export const AutocompleteItem = ({
  value,
  disabled,
  onSelect,
  className,
  children,
}: AutocompleteItemProps) => {
  const { activeValue, setActiveValue, getItemId, registerSelectHandler, runSelectHandler } =
    useAutocompleteContext("AutocompleteItem");

  useEffect(() => {
    if (disabled) return;
    return registerSelectHandler(value, onSelect);
  }, [value, disabled, onSelect, registerSelectHandler]);

  const isActive = activeValue === value;

  return (
    <div
      id={getItemId(value)}
      role="option"
      aria-selected={isActive}
      data-value={value}
      data-disabled={disabled ? "true" : undefined}
      onMouseEnter={() => !disabled && setActiveValue(value)}
      onClick={() => !disabled && runSelectHandler(value)}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors",
        isActive && "bg-muted",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {children}
    </div>
  );
};

type AutocompleteGroupProps = {
  label: ReactNode;
  children: ReactNode;
  className?: string;
};

export const AutocompleteGroup = ({ label, children, className }: AutocompleteGroupProps) => (
  <div role="group" className={cn("py-1", className)}>
    <p className="px-1.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    {children}
  </div>
);
