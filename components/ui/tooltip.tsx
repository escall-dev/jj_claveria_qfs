"use client";

import React, { useState, useRef, useEffect, useId, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
  disabled?: boolean;
}

const emptySubscribe = () => () => {};

export function Tooltip({
  content,
  children,
  position = "right",
  className = "",
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    switch (position) {
      case "right":
        top = rect.top + rect.height / 2;
        // Position clearly outside the collapsed sidebar (which ends at 80px),
        // with comfortable clearance from both the trigger and sidebar border
        left = Math.max(rect.right + 10, 88);
        break;
      case "left":
        top = rect.top + rect.height / 2;
        left = rect.left - 10;
        break;
      case "top":
        top = rect.top - 10;
        left = rect.left + rect.width / 2;
        break;
      case "bottom":
        top = rect.bottom + 10;
        left = rect.left + rect.width / 2;
        break;
    }

    setCoords({ top, left });
  }, [position]);

  const showTooltip = () => {
    if (disabled || !content) return;
    updatePosition();
    setIsVisible(true);
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  // Keep position synchronized during scroll or resize while visible
  useEffect(() => {
    if (!isVisible) return;
    const handleScrollOrResize = () => {
      updatePosition();
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isVisible, updatePosition]);

  const transformStyle: React.CSSProperties = {
    position: "fixed",
    top: coords ? `${coords.top}px` : "0px",
    left: coords ? `${coords.left}px` : "0px",
    transform:
      position === "right"
        ? "translateY(-50%)"
        : position === "left"
        ? "translate(-100%, -50%)"
        : position === "top"
        ? "translate(-50%, -100%)"
        : "translateX(-50%)",
  };

  return (
    <div
      ref={triggerRef}
      className={`inline-flex ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      onFocusCapture={showTooltip}
      onBlurCapture={hideTooltip}
      onClick={hideTooltip}
      aria-describedby={isVisible ? tooltipId : undefined}
    >
      {children}
      {isMounted && isVisible && coords && createPortal(
        <div
          id={tooltipId}
          role="tooltip"
          style={transformStyle}
          className="pointer-events-none z-50 flex items-center whitespace-nowrap rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg border border-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-200 select-none animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {content}
          {position === "right" && (
            <span
              className="absolute -left-1 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-zinc-900 dark:border-r-zinc-100"
              aria-hidden="true"
            />
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

