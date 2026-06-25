import { useEffect, useState } from "react";

export type ScreenClass = "phone" | "tablet" | "desktop";

export type Capabilities = {
  hasHover: boolean;
  hasRightClick: boolean;
  hasKeyboard: boolean;
  hasTouch: boolean;
  screenClass: ScreenClass;
};

function getScreenClass(width: number): ScreenClass {
  if (width < 700) return "phone";
  if (width < 1100) return "tablet";
  return "desktop";
}

export function detectCapabilities(): Capabilities {
  if (typeof window === "undefined") {
    return {
      hasHover: true,
      hasRightClick: true,
      hasKeyboard: true,
      hasTouch: false,
      screenClass: "desktop"
    };
  }

  const hasHover = window.matchMedia("(hover: hover)").matches;
  const hasTouch =
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0 ||
    "ontouchstart" in window;

  return {
    hasHover,
    hasRightClick: hasHover,
    hasKeyboard: !hasTouch || window.innerWidth >= 900,
    hasTouch,
    screenClass: getScreenClass(window.innerWidth)
  };
}

export function useCapabilities() {
  const [capabilities, setCapabilities] = useState<Capabilities>(() => detectCapabilities());

  useEffect(() => {
    function updateCapabilities() {
      setCapabilities(detectCapabilities());
    }

    window.addEventListener("resize", updateCapabilities);
    window.addEventListener("orientationchange", updateCapabilities);

    return () => {
      window.removeEventListener("resize", updateCapabilities);
      window.removeEventListener("orientationchange", updateCapabilities);
    };
  }, []);

  return capabilities;
}
