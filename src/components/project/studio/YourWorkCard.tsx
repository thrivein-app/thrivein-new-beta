import { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowUpRight, FolderInput, Share2, Play, Music, Camera, PenLine, Palette, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { moodGradient } from "./moodGradient";
import { monogram } from "./studioCardHelpers";
import { inferStudioType, type StudioTypeId } from "@/lib/studioProjectType";

const TYPE_ICON: Record<StudioTypeId, typeof Play> = {
  photo: Camera,
  video: Play,
  music: Music,
  design: Palette,
  brand: Sparkles,
  writing: PenLine,
  event: Sparkles,
  project: Sparkles,
};

export interface YourWorkCardProject {
  id: string;
  title: string;
  workspace_type?: string | null;
  description?: string | null;
  client_name?: string | null;
  cover_url?: string | null;
  mood?: string | null;
  status?: string | null;
  updated_at: string;
}

export interface YourWorkCardProps {
  project: YourWorkCardProject;
  /** Short line under the title — usually the next thing to do. */
  nextAction?: string;
  statusLabel?: string;
  /** e.g. "Invoiced" — rendered with a dot. */
  metaLabel?: string;
  metaDotClassName?: string;
  onOpen: () => void;
  onShare?: () => void;
  onMove?: () => void;
  className?: string;
}

/**
 * YourWorkCard — a project as a showcase tile.
 *
 * The cover carries most of the weight: the project's own image when it
 * has one, otherwise a HD themed still picked from what the project
 * actually is (photo / video / music / design…), tinted by its mood so
 * two same-type projects never look identical.
 */
export const YourWorkCard = ({
  project: p,
  nextAction,
  statusLabel,
  metaLabel,
  metaDotClassName,
  onOpen,
  onShare,
  onMove,
  className,
}: YourWorkCardProps) => {
  const type = inferStudioType(p.workspace_type, p.title, p.description);
  const TypeIcon = TYPE_ICON[type.id];
  const [broken, setBroken] = useState(false);
  const src = !broken && p.cover_url ? p.cover_url : type.cover;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-background transition-all",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl focus-within:border-primary/50",
        className,
      )}
    >
      {/* Cover — ~60% of the tile */}
      <div className="relative aspect-[16/9] overflow-hidden" style={{ background: moodGradient(p.mood) }}>
        <img
          src={src}
          alt={`Cover for ${p.title} — ${type.label} project`}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, hsl(0 0% 0% / 0.35) 0%, transparent 40%, hsl(var(--background)/0.92) 100%)" }}
        />

        {/* Type badge */}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white ring-1 ring-white/25">
          <TypeIcon className="h-3 w-3" aria-hidden />
          {type.label}
        </span>

        {statusLabel && (
          <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white ring-1 ring-white/25">
            {statusLabel}
          </span>
        )}

        <span className="absolute bottom-3 left-3 grid h-9 w-9 place-items-center rounded-xl bg-black/35 text-xs font-black text-white ring-1 ring-white/25">
          {monogram(p.title)}
        </span>

        {/* Quick actions — visible on hover and whenever focused */}
        {(onShare || onMove) && (
          <div className="absolute bottom-3 right-3 z-[2] flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                aria-label={`Share ${p.title}`}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/25 transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
            {onMove && (
              <button
                type="button"
                onClick={onMove}
                aria-label={`Move ${p.title} to a folder`}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/25 transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <FolderInput className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3.5">
        <h3 className="truncate text-sm font-bold leading-snug">{p.title}</h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {p.client_name || p.description || `${type.label} project`}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>{formatDistanceToNowStrict(new Date(p.updated_at))} ago</span>
          {metaLabel && (
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", metaDotClassName)} aria-hidden />
              {metaLabel}
            </span>
          )}
        </p>

        {nextAction && (
          <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-foreground">
            {nextAction}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </p>
        )}
      </div>

      {/* Full-tile hit target, keyboard focusable, under the quick actions */}
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 z-[1] rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="sr-only">Open {p.title}</span>
      </button>
    </article>
  );
};

export default YourWorkCard;
