import { useEffect } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";

export type Vibe = "daylight" | "midnight" | "neon";
const STORAGE_KEY = "ui_vibe";

export function isVibe(v: unknown): v is Vibe {
  return v === "daylight" || v === "midnight" || v === "neon";
}

export function applyVibe(vibe: Vibe, setNextTheme?: (t: string) => void) {
  document.documentElement.setAttribute("data-vibe", vibe);
  try {
    localStorage.setItem(STORAGE_KEY, vibe);
  } catch {}
  // Midnight + Neon use the .dark class so shadcn dark variants apply.
  if (setNextTheme) {
    setNextTheme(vibe === "daylight" ? "light" : "dark");
  }
  window.dispatchEvent(new CustomEvent("ui-vibe:change", { detail: vibe }));
}

export function getStoredVibe(): Vibe {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isVibe(v)) return v;
  } catch {}
  return "daylight";
}

/**
 * Mirrors ModeThemeSync. Reads profiles.ui_vibe (or localStorage for guests),
 * sets [data-vibe] on <html>, and aligns next-themes light/dark accordingly.
 */
export function VibeThemeSync() {
  const { setTheme } = useTheme();

  useEffect(() => {
    // Two modes only: Dark (midnight) and Light (daylight). Neon is retired —
    // anyone still stored on it falls back to Dark.
    const stored = getStoredVibe();
    applyVibe(stored === "daylight" ? "daylight" : "midnight", setTheme);
    const onChange = (e: Event) => {
      const v = (e as CustomEvent).detail;
      if (v === "daylight" || v === "midnight") setTheme(v === "daylight" ? "light" : "dark");
    };
    window.addEventListener("ui-vibe:change", onChange);
    return () => window.removeEventListener("ui-vibe:change", onChange);
  }, [setTheme]);

  return null;
}

/** Persist a vibe to the user's profile + apply locally. */
export async function saveVibe(vibe: Vibe) {
  applyVibe(vibe);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ ui_vibe: vibe } as any)
      .eq("user_id", user.id);
  } catch (err) {
    console.warn("[saveVibe] failed", err);
  }
}
