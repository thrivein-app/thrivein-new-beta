import { motion } from "framer-motion";
import { MessageCircle, PenLine } from "lucide-react";
import { ThrivePresence } from "@/components/ThrivePresence";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface TodayHeaderProps {
  firstName: string;
  /** Dynamic, personalised line from Kreto. Falls back to a sensible default. */
  subtitle?: string;
  className?: string;
}

/**
 * TODAY HEADER — the tone-setter for the Today dashboard.
 * Kreto is present (breathing signal mark), the line is personalised, and the
 * two things Kreto can do for the user right now are one tap away.
 * Pure presentation: no data fetching lives here.
 */
export function TodayHeader({ firstName, subtitle, className }: TodayHeaderProps) {
  const reducedMotion = useReducedMotion();

  const line =
    subtitle ??
    "Your Creative Passport is doing the work — want me to draft an outreach DM?";

  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.35, ease: [0.2, 0.65, 0.3, 0.95] }}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border bg-card p-4 sm:p-5",
        className,
      )}
    >
      {/* Kreto aura — decorative, never blocks reading */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative flex items-start gap-3">
        <ThrivePresence size="lg" tone="active" className="shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Kreto · Today
          </p>
          <h2 className="text-lg sm:text-xl font-black leading-tight text-foreground">
            {firstName}, here&rsquo;s what moves you forward.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{line}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="rounded-full gap-1.5"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("thrive-copilot:open", {
                    detail: {
                      prompt: "Draft a short outreach DM I can send today to a collaborator or client who fits my Passport.",
                    },
                  }),
                )
              }
            >
              <PenLine className="h-3.5 w-3.5" />
              Draft outreach
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full gap-1.5"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("thrive-copilot:open", { detail: {} }))
              }
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Or just chat
            </Button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default TodayHeader;
