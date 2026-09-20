import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

// useLayoutEffect on the client so the hidden state is applied before the first
// paint (no flash); useEffect on the server to avoid the SSR warning.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type RevealProps = {
  children: ReactNode;
  /** Element to render. Use a DOM tag — refs are not forwarded to components. */
  as?: ElementType;
  className?: string;
  /** ms delay before a single-block reveal starts. */
  delay?: number;
  /** px the content travels upward on the way in. */
  y?: number;
  /** Stagger the direct children instead of revealing the block as one unit. */
  stagger?: boolean;
  threshold?: number;
};

/**
 * Scroll/entrance reveal that ENHANCES an already-visible default.
 *
 * SSR, no-JS, headless renderers, and `prefers-reduced-motion` all render the
 * content fully visible: the hidden state is only ever applied on the client,
 * after mount, when motion is allowed. A safety timer guarantees the content is
 * never left hidden if the observer is throttled (e.g. a backgrounded tab).
 */
export function Reveal({
  children,
  as: Tag = "div",
  className,
  delay = 0,
  y = 16,
  stagger = false,
  threshold = 0.15,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return; // leave content visible

    setArmed(true); // applies the hidden state before the browser paints

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);

    // Safety net: never leave content hidden (observers can be throttled).
    const fallback = window.setTimeout(() => setShown(true), 1500);

    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, [threshold]);

  const state = armed ? (shown ? "shown" : "hidden") : undefined;
  const dataAttr = stagger ? { "data-reveal-group": state } : { "data-reveal": state };

  return (
    <Tag
      ref={ref}
      {...dataAttr}
      className={className}
      style={{ "--reveal-delay": `${delay}ms`, "--reveal-y": `${y}px` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
