import coverPhoto from "@/assets/scout/cover-photo.jpg";
import coverFilm from "@/assets/scout/cover-film.jpg";
import coverMusic from "@/assets/scout/cover-music.jpg";
import coverDesign from "@/assets/scout/cover-design.jpg";
import coverWriting from "@/assets/scout/cover-writing.jpg";
import coverGeneric from "@/assets/scout/cover-generic.jpg";

export type StudioTypeId = "photo" | "video" | "music" | "design" | "brand" | "writing" | "event" | "project";

export interface StudioType {
  id: StudioTypeId;
  label: string;
  cover: string;
}

const TYPES: Record<StudioTypeId, StudioType> = {
  photo: { id: "photo", label: "Photo", cover: coverPhoto },
  video: { id: "video", label: "Video", cover: coverFilm },
  music: { id: "music", label: "Music", cover: coverMusic },
  design: { id: "design", label: "Design", cover: coverDesign },
  brand: { id: "brand", label: "Brand", cover: coverDesign },
  writing: { id: "writing", label: "Writing", cover: coverWriting },
  event: { id: "event", label: "Event", cover: coverGeneric },
  project: { id: "project", label: "Project", cover: coverGeneric },
};

/** workspace_type values used across the Studio slices. */
const WORKSPACE_MAP: Record<string, StudioTypeId> = {
  photo: "photo",
  photography: "photo",
  modeling: "photo",
  content: "video",
  video: "video",
  film: "video",
  podcast: "music",
  music: "music",
  music_release: "music",
  design: "design",
  campaign: "brand",
  brand_campaign: "brand",
  brand: "brand",
  writing: "writing",
  event: "event",
  general: "project",
};

const KEYWORDS: [StudioTypeId, RegExp][] = [
  ["music", /\b(album|ep|single|track|song|mix|master|studio session|beat|record(ing)?|podcast|audio)\b/i],
  ["video", /\b(video|film|reel|shoot day|edit|montage|documentary|clip|trailer|youtube|tiktok)\b/i],
  ["photo", /\b(photo|shoot|portrait|lookbook|editorial|headshot|campaign shoot|lens)\b/i],
  ["design", /\b(design|ui|ux|website|app|figma|layout|poster|packaging|deck)\b/i],
  ["brand", /\b(brand|identity|logo|rebrand|campaign|marketing|launch)\b/i],
  ["writing", /\b(script|copy|article|newsletter|story|treatment|blog)\b/i],
  ["event", /\b(event|festival|show|gig night|party|conference|tour)\b/i],
];

/** Infer the kind of work a project is, from its workspace type first,
 *  then from its title/description wording. */
export const inferStudioType = (
  workspaceType?: string | null,
  ...text: (string | null | undefined)[]
): StudioType => {
  const mapped = workspaceType ? WORKSPACE_MAP[workspaceType.toLowerCase()] : undefined;
  if (mapped && mapped !== "project") return TYPES[mapped];

  const haystack = text.filter(Boolean).join(" ");
  if (haystack) {
    for (const [id, re] of KEYWORDS) if (re.test(haystack)) return TYPES[id];
  }
  return TYPES[mapped ?? "project"];
};
