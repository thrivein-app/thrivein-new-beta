import { useMemo } from "react";
import {
  Camera, Music, Clapperboard, PenTool, PenLine, Sparkles, Wrench, Shirt,
  Code2, Footprints, Palette, type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { inferProfession } from "@/lib/passport/professionProfiles";
import { cn } from "@/lib/utils";

/**
 * CraftStamp — the golden craft stamp on a Creative Passport.
 *
 * Same idea as a country stamp in a real passport, but for the creative
 * branch the person works in. Replaces the old flat "L1" level chip: same
 * slot, same size band, but a metallic gold seal with a craft icon.
 *
 * The craft is inferred from the profile (role + sub_roles) via the
 * existing `inferProfession` helper, extended here with a few branches the
 * archetype list doesn't cover (tech, fashion, dance, visual design).
 */

export type CraftKey =
  | "software" | "fashion" | "music" | "photo" | "film" | "design"
  | "writing" | "dance" | "crew" | "model" | "creator";

const CRAFTS: Record<CraftKey, { label: string; Icon: LucideIcon }> = {
  software: { label: "Software & Tech", Icon: Code2 },
  fashion: { label: "Fashion", Icon: Shirt },
  music: { label: "Music", Icon: Music },
  photo: { label: "Photo & Video", Icon: Camera },
  film: { label: "Film", Icon: Clapperboard },
  design: { label: "Visual Design", Icon: PenTool },
  writing: { label: "Writing & Content", Icon: PenLine },
  dance: { label: "Dance & Performance", Icon: Footprints },
  crew: { label: "Crew", Icon: Wrench },
  model: { label: "Model", Icon: Palette },
  creator: { label: "Creator", Icon: Sparkles },
};

const EXTRA: Array<[RegExp, CraftKey]> = [
  [/\b(dev|engineer|software|program|tech|web|data|ai)\b/i, "software"],
  [/\b(fashion|stylist|styling|tailor|couture|wardrobe)\b/i, "fashion"],
  [/\b(dance|dancer|choreograph|perform|theatre|theater|actor|actress)\b/i, "dance"],
];

export function inferCraft(profile: {
  role?: string | null;
  sub_roles?: string[] | null;
  passport_profession?: string | null;
}): CraftKey {
  const text = [profile?.role, ...(profile?.sub_roles ?? [])].filter(Boolean).join(" ");
  for (const [re, key] of EXTRA) if (re.test(text)) return key;

  switch (inferProfession(profile as any)) {
    case "photographer": return "photo";
    case "musician": return "music";
    case "filmmaker": return "film";
    case "designer": return "design";
    case "writer": return "writing";
    case "model": return "model";
    case "crew": return "crew";
    default: return "creator";
  }
}

interface CraftStampProps {
  profile: { role?: string | null; sub_roles?: string[] | null; passport_profession?: string | null };
  /** Optional caption under the icon, e.g. the Standing title. */
  caption?: string;
  size?: "sm" | "md";
  className?: string;
}

export function CraftStamp({ profile, caption, size = "md", className }: CraftStampProps) {
  const craft = useMemo(() => inferCraft(profile), [profile]);
  const { label, Icon } = CRAFTS[craft];
  const dim = size === "sm" ? "h-9 w-9" : "h-12 w-12";
  const iconDim = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn("inline-flex flex-col items-center gap-1 shrink-0", className)}
            aria-label={`Craft stamp — ${label}`}
          >
            <span className={cn("craft-stamp relative grid place-items-center rounded-full", dim)}>
              <span aria-hidden className="craft-stamp__shine absolute inset-0 rounded-full" />
              <Icon className={cn(iconDim, "relative text-[#4A360C]")} strokeWidth={2.2} />
            </span>
            {caption && (
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {caption}
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="left">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
