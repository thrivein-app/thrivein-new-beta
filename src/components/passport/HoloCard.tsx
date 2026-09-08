import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HoloCardProps {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees. */
  maxTilt?: number;
}

/** Kretopia's premium credential shell: dimensional, refractive and restrained. */
export function HoloCard({ children, className, maxTilt = 6 }: HoloCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, on: false });
  const [inView, setInView] = useState(true);

  // Pause the subtle ambient depth when the card scrolls offscreen.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const interactive = useCallback(() => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }, []);

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive() || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      setTilt({ x: (0.5 - py) * maxTilt * 2, y: (px - 0.5) * maxTilt * 2 });
      setGlare({ x: px * 100, y: py * 100, on: true });
    },
    [interactive, maxTilt]
  );

  const onLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setGlare((g) => ({ ...g, on: false }));
  }, []);

  return (
    <div className={cn("[perspective:1600px]", className)}>
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="group/holo relative isolate h-full rounded-2xl transition-transform duration-500 ease-out will-change-transform [transform-style:preserve-3d] motion-reduce:transform-none"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(0)`,
        }}
      >
        {/* A quiet energy field separates the credential from the page. */}
        <div
          aria-hidden
          className="holo-card-aura pointer-events-none absolute -inset-3 rounded-[24px] blur-2xl"
          style={{
            transform: "translateZ(-40px)",
            animationPlayState: inView ? "running" : "paused",
          }}
        />

        <div className="holo-card-frame relative h-full overflow-hidden rounded-2xl">
          <div className="relative z-10 h-full [transform:translateZ(1px)]">{children}</div>

          {/* Pointer-following optical foil, strongest only while engaged. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 mix-blend-soft-light transition-opacity duration-500"
            style={{
              opacity: glare.on ? 0.78 : 0.18,
              background: `radial-gradient(110% 80% at ${glare.x}% ${glare.y}%, hsl(var(--foreground) / 0.46), hsl(var(--energy) / 0.12) 30%, transparent 66%)`,
            }}
          />
          <div aria-hidden className="holo-card-grid pointer-events-none absolute inset-0 z-20 opacity-40" />
          <div aria-hidden className="holo-card-edge pointer-events-none absolute inset-0 z-30 rounded-2xl" />
          <span aria-hidden className="absolute bottom-3 right-3 z-30 h-1.5 w-1.5 rounded-full bg-[hsl(var(--energy))] shadow-[0_0_12px_hsl(var(--energy)/0.8)]" />
        </div>
      </div>
    </div>
  );
}

export default HoloCard;
