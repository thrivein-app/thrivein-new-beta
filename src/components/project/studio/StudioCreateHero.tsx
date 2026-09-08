import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Mic, FileText, ListChecks, Receipt, Sparkles } from "lucide-react";
import { CtaButton } from "@/components/ui/cta-button";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface StudioCreateHeroProps {
  onCreate: () => void;
  onVoice: () => void;
  /** Real count of the user's existing Projects — drives the supporting line only. */
  projectCount: number;
  activeCount: number;
}

const PROOF = [
  { icon: FileText, label: "Brief", copy: "Your idea, structured into a brief you can edit." },
  { icon: ListChecks, label: "Work", copy: "Tasks, deliverables and milestones in one place." },
  { icon: Receipt, label: "Wrap", copy: "Credits and an invoice draft when the work ends." },
];

/** Illustrative prompts — never presented as live data, they only show
 *  the kind of sentence a New Room understands. */
const PROMPTS = [
  "A three-day fashion shoot in Port of Spain, crew of six.",
  "An eight-episode podcast season with a weekly release.",
  "A brand campaign: paid social, organic and a hero film.",
  "A single release — masters, splits and a launch checklist.",
];

/**
 * Studio home hero — the New Room is the feature, not a button. Same
 * cinematic plate as every other Kretopia surface (midnight base,
 * breathing aurora, quadrille grid, grain) with Kreto present and a
 * live prompt line. Copy stays inside what is actually shipped: Kreto
 * drafts a structure, the user reviews and confirms before anything is
 * created.
 */
export const StudioCreateHero = ({ onCreate, onVoice, projectCount, activeCount }: StudioCreateHeroProps) => {
  const reducedMotion = useReducedMotion();
  const [promptIndex, setPromptIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => setPromptIndex((i) => (i + 1) % PROMPTS.length), 4200);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  return (
    <section
      aria-labelledby="studio-hero-title"
      className="dark relative isolate overflow-hidden rounded-3xl border border-white/10"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      {/* aurora — same plate as FeaturePageHeader / landing chapters */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 ai-ambient-breathe"
        style={{ background: "radial-gradient(70% 60% at 20% 0%, hsl(var(--energy) / 0.18), transparent 64%)" }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-quadrille" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.13]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div className="relative p-6 sm:p-9">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="hidden sm:inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full mt-0.5"
            style={{ backgroundColor: "hsl(var(--energy) / 0.14)" }}
          >
            <Sparkles className="h-4 w-4" style={{ color: "hsl(var(--energy))" }} />
          </span>
          <div className="min-w-0">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ borderColor: "hsl(var(--energy) / 0.35)", color: "hsl(var(--energy))" }}
            >
              <Sparkles className="h-3 w-3" aria-hidden />
              New Room
            </span>
            <h2
              id="studio-hero-title"
              className="mt-3 text-3xl sm:text-4xl font-black tracking-[-0.03em] text-white leading-[1.05]"
            >
              Say what you're making.
              <br />
              <span style={{ color: "hsl(var(--energy))" }}>Kreto builds the room.</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm sm:text-base text-white/55">
              By voice or text. Kreto shapes a brief and a starting structure, you review and
              edit it, and nothing is created until you confirm.
            </p>
          </div>
        </div>

        {/* One entry point. The prompt line IS the CTA — the primary action
            sits inside it, so there is no competing second big button and no
            second mic. Voice is a typographic secondary underneath. */}
        <div
          className="group mt-6 rounded-2xl border p-2 transition-colors focus-within:border-[hsl(var(--energy)/0.55)] hover:border-[hsl(var(--energy)/0.45)]"
          style={{ borderColor: "hsl(var(--energy) / 0.22)", backgroundColor: "rgba(255,255,255,0.03)" }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onCreate}
              aria-label="Open the New Room"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-3 text-left"
            >
              <span className="min-w-0 flex-1 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={promptIndex}
                    initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.32, ease: [0.2, 0.65, 0.3, 0.95] }}
                    className="block truncate text-sm text-white/60"
                  >
                    &ldquo;{PROMPTS[promptIndex]}&rdquo;
                  </motion.span>
                </AnimatePresence>
              </span>
            </button>
            <CtaButton onClick={onCreate} data-testid="studio-create-project" className="shrink-0 sm:w-auto">
              Open a New Room
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </CtaButton>
          </div>
        </div>

        <button
          type="button"
          onClick={onVoice}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/50 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white/80"
        >
          <Mic className="h-3.5 w-3.5" aria-hidden />
          Or describe it out loud
        </button>

        <p className="mt-3 text-xs text-white/40">
          {projectCount === 0
            ? "Your first Project takes about a minute to set up."
            : `${projectCount} Project${projectCount === 1 ? "" : "s"} in Studio · ${activeCount} in progress`}
        </p>

        <ul className="mt-7 grid gap-3 sm:grid-cols-3">
          {PROOF.map(({ icon: Icon, label, copy }, i) => (
            <motion.li
              key={label}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.2, 0.65, 0.3, 0.95] }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" style={{ color: "hsl(var(--energy))" }} aria-hidden />
                <span className="text-xs font-bold uppercase tracking-wider text-white">{label}</span>
              </div>
              <p className="mt-1.5 text-xs text-white/50">{copy}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default StudioCreateHero;
