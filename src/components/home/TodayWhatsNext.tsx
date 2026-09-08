import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ThrivePresence } from "@/components/ThrivePresence";

interface TodayWhatsNextProps {
  /** The single highest-priority thing (TodayFocus). */
  focus: ReactNode;
  /** Denser follow-ups: approvals, deadlines, discovery, people. */
  more?: ReactNode;
}

/**
 * TODAY — WHAT'S NEXT. One compact, Kreto-led block instead of a stack of
 * unrelated cards. It owns no data: it arranges the existing Focus / More
 * surfaces under a single header so the page reads as one decision flow.
 */
export function TodayWhatsNext({ focus, more }: TodayWhatsNextProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.08, ease: [0.2, 0.65, 0.3, 0.95] }}
      className="space-y-3"
    >
      <header className="flex items-center gap-2.5 px-1">
        <ThrivePresence size="sm" tone="rest" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Kreto suggests
          </p>
          <h2 className="text-base font-black leading-tight text-foreground flex items-center gap-1.5">
            <Compass className="h-4 w-4 text-primary" aria-hidden />
            What&rsquo;s next
          </h2>
        </div>
      </header>

      {focus}
      {more}
    </motion.section>
  );
}

export default TodayWhatsNext;
