import * as React from "react";

/**
 * Returns the bottom inset caused by the on-screen virtual keyboard, so fixed
 * and docked composers can lift above it on mobile browsers.
 */
export function useVisualViewportOffset() {
  const [offset, setOffset] = React.useState(0);

  React.useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const inset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      setOffset(inset);
    };

    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    update();

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return offset;
}
