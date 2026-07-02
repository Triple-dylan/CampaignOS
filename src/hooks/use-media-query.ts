import * as React from "react";

export function useMediaQuery(query: string, defaultValue = false) {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window === "undefined") {
      return defaultValue;
    }

    return window.matchMedia(query).matches;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => {
      setMatches(mql.matches);
    };

    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Viewports below Tailwind's `lg` breakpoint (1024px). */
export function useIsBelowLg() {
  return useMediaQuery("(max-width: 1023px)");
}
