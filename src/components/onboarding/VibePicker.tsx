import { cn } from "@/lib/utils";
import { saveVibe, getStoredVibe, type Vibe } from "@/components/VibeThemeSync";
import { useState, useEffect } from "react";
import { Moon, Sun, Check } from "lucide-react";

/**
 * Theme picker — two modes only: Dark (Midnight) and Light.
 * Neon was retired; anyone still stored on it lands on Dark.
 */
interface Tile {
  id: Extract<Vibe, "daylight" | "midnight">;
  label: string;
  blurb: string;
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  Icon: typeof Sun;
}

const TILES: Tile[] = [
  {
    id: "midnight",
    label: "Dark",
    blurb: "Midnight canvas, pink signal.",
    bg: "#05070D",
    fg: "#FFFFFF",
    muted: "#A8B0C0",
    accent: "#FF2DA1",
    Icon: Moon,
  },
  {
    id: "daylight",
    label: "Light",
    blurb: "White canvas, ink text, pink signal.",
    bg: "#FFFFFF",
    fg: "#14141A",
    muted: "#5C5C68",
    accent: "#CC0080",
    Icon: Sun,
  },
];

interface VibePickerProps {
  onPick?: (vibe: Vibe) => void;
  compact?: boolean;
}

export function VibePicker({ onPick, compact = false }: VibePickerProps) {
  const [selected, setSelected] = useState<Vibe>("midnight");

  useEffect(() => {
    const stored = getStoredVibe();
    setSelected(stored === "daylight" ? "daylight" : "midnight");
  }, []);

  const handlePick = async (v: Vibe) => {
    setSelected(v);
    await saveVibe(v);
    onPick?.(v);
  };

  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
      {TILES.map((t) => {
        const active = selected === t.id;
        const { Icon } = t;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => handlePick(t.id)}
            aria-pressed={active}
            className={cn(
              "rounded-2xl border-2 p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active ? "border-primary shadow-md" : "border-border hover:border-primary/40",
            )}
          >
            <div
              className="rounded-xl p-3 mb-2 aspect-[4/3] flex flex-col justify-between border"
              style={{ background: t.bg, color: t.fg, borderColor: `${t.fg}1A` }}
            >
              <div className="flex items-center justify-between">
                <div className="h-1 w-8 rounded-full" style={{ background: t.accent }} />
                <Icon className="h-3.5 w-3.5" style={{ color: t.muted }} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: t.muted }}>Project</div>
                <div className="text-[11px] font-bold leading-tight">Cover Story</div>
                <div
                  className="mt-1 inline-block text-[9px] px-1.5 py-0.5 rounded font-bold"
                  style={{ background: t.accent, color: "#fff" }}
                >
                  Match
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              {t.label}
              {active && <Check className="h-3.5 w-3.5 text-primary" aria-hidden />}
            </div>
            {!compact && (
              <div className="text-[11px] text-muted-foreground leading-snug">{t.blurb}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
