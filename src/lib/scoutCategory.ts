// Infers a discipline for a scouted gig from its free text, so every card can
// show a meaningful HD cover + a human "what kind of work is this" subtitle
// even when the source page gave us no image at all.
import coverMusic from "@/assets/scout/cover-music.jpg";
import coverFilm from "@/assets/scout/cover-film.jpg";
import coverDesign from "@/assets/scout/cover-design.jpg";
import coverPhoto from "@/assets/scout/cover-photo.jpg";
import coverWriting from "@/assets/scout/cover-writing.jpg";
import coverGeneric from "@/assets/scout/cover-generic.jpg";

export type ScoutCategoryId =
  | "music"
  | "film"
  | "design"
  | "photo"
  | "writing"
  | "creative";

export interface ScoutCategory {
  id: ScoutCategoryId;
  /** Human label used as the card's context line, e.g. "Video & film". */
  label: string;
  /** HD themed cover used when the listing has no usable image. */
  cover: string;
}

const CATEGORIES: Record<ScoutCategoryId, ScoutCategory> = {
  music: { id: "music", label: "Music & audio", cover: coverMusic },
  film: { id: "film", label: "Video & film", cover: coverFilm },
  design: { id: "design", label: "Design & brand", cover: coverDesign },
  photo: { id: "photo", label: "Photography", cover: coverPhoto },
  writing: { id: "writing", label: "Writing & content", cover: coverWriting },
  creative: { id: "creative", label: "Creative work", cover: coverGeneric },
};

const MATCHERS: Array<[ScoutCategoryId, RegExp]> = [
  ["music", /\b(music|audio|sound|mix(ing)?|master(ing)?|producer|beat|song|vocal|studio session|composer|score|dj|podcast edit)\b/i],
  ["film", /\b(video|film|cinema|editor|editing|premiere|after effects|davinci|motion|animation|vfx|director of photography|dop|cinematograph|reel|documentar)\b/i],
  ["photo", /\b(photo|photograph|shoot|retouch|lightroom|headshot|lookbook|campaign shoot)\b/i],
  ["design", /\b(design|designer|brand|branding|logo|identity|figma|illustrat|ui|ux|graphic|art direct|packaging)\b/i],
  ["writing", /\b(writ|copy|content|editor(ial)?|journalis|script|blog|newsletter|social media manager|community manager)\b/i],
];

export function inferScoutCategory(...text: Array<string | null | undefined>): ScoutCategory {
  const haystack = text.filter(Boolean).join(" ");
  for (const [id, re] of MATCHERS) {
    if (re.test(haystack)) return CATEGORIES[id];
  }
  return CATEGORIES.creative;
}

/** Contract shape, when the listing text makes it obvious. */
export function inferEngagement(...text: Array<string | null | undefined>): string | null {
  const h = text.filter(Boolean).join(" ");
  if (/\bfreelance|contract(or)?\b/i.test(h)) return "Freelance";
  if (/\bpart[- ]time\b/i.test(h)) return "Part-time";
  if (/\bfull[- ]time\b/i.test(h)) return "Full-time";
  if (/\bintern(ship)?\b/i.test(h)) return "Internship";
  if (/\bproject[- ]based|one[- ]off|per project\b/i.test(h)) return "Project-based";
  return null;
}

/** Seniority hint, when stated. */
export function inferSeniority(...text: Array<string | null | undefined>): string | null {
  const h = text.filter(Boolean).join(" ");
  if (/\b(senior|lead|head of|principal)\b/i.test(h)) return "Senior";
  if (/\b(junior|entry[- ]level|graduate|assistant)\b/i.test(h)) return "Junior";
  if (/\b(mid[- ]level|intermediate)\b/i.test(h)) return "Mid";
  return null;
}
