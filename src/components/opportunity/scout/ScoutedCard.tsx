import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bookmark, MapPin, Sparkles, X } from "lucide-react";
import { useEffect, useState, type ComponentType, type MouseEvent, type ReactNode } from "react";

export interface ScoutedCardProps {
  /** Gig title — the loudest thing on the card. */
  title: string;
  /** One-line context: discipline · client · seniority. */
  subtitle: string;
  /** HD cover. Always provide one (themed fallback if the source had none). */
  imageUrl: string;
  /** Descriptive alt text. */
  imageAlt: string;
  /** Themed HD cover used if `imageUrl` fails to load. */
  fallbackImageUrl?: string;
  /** Small key facts rendered as discreet badges (3-5 max). */
  tags?: string[];
  /** Fit percentage badge, 0-100. */
  fitScore?: number | null;
  /** Kreto's short "why this fits you" note. */
  fitReason?: string | null;
  location?: string | null;
  remote?: boolean;
  /** Provenance line, e.g. "via LinkedIn · 2 days ago". */
  metaLine?: string;
  metaIcon?: ComponentType<{ className?: string }>;
  /** Ribbon over the cover, e.g. "Strongest match". */
  ribbon?: ReactNode;
  ctaLabel?: string;
  onCtaClick: () => void;
  onSave?: (e: MouseEvent) => void;
  onDismiss?: (e: MouseEvent) => void;
  /** "grid" = vertical tile in a carousel; "feature" = wide hero row. */
  variant?: "grid" | "feature";
  /** Skip lazy-loading for an above-the-fold hero image. */
  priorityImage?: boolean;
  className?: string;
}

/**
 * The Scout "Scouted for you" card. One job: make a stranger's gig
 * understandable in under two seconds — big HD cover, bold title, a single
 * context line, a few hard facts, and one unmissable action.
 */
export function ScoutedCard({
  title,
  subtitle,
  imageUrl,
  imageAlt,
  fallbackImageUrl,
  tags = [],
  fitScore,
  fitReason,
  location,
  remote,
  metaLine,
  metaIcon: MetaIcon,
  ribbon,
  ctaLabel = "View gig",
  onCtaClick,
  onSave,
  onDismiss,
  variant = "grid",
  priorityImage = false,
  className,
}: ScoutedCardProps) {
  const feature = variant === "feature";
  // Scraped source images 404 often — swap to the themed HD cover rather than
  // leaving a blank hole in the card.
  const [src, setSrc] = useState(imageUrl);
  useEffect(() => setSrc(imageUrl), [imageUrl]);

  const cover = (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-muted",
        feature ? "aspect-[16/9] sm:aspect-auto sm:w-[19rem]" : "aspect-[16/9]",
      )}
    >
      <img
        src={src}
        alt={imageAlt}
        width={1280}
        height={720}
        loading={priorityImage ? "eager" : "lazy"}
        decoding="async"
        onError={() => {
          if (fallbackImageUrl && src !== fallbackImageUrl) setSrc(fallbackImageUrl);
        }}
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
      />
      {/* Legibility scrim — keeps the badges readable on any photo. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-background/40" />

      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <Badge className="border-none bg-black/65 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          <Sparkles className="mr-1 h-2.5 w-2.5 text-energy" />
          {ribbon ?? "Scouted"}
        </Badge>
        {typeof fitScore === "number" && (
          <Badge className="border-energy/40 bg-black/65 text-[10px] font-bold text-energy">
            {fitScore}% fit
          </Badge>
        )}
      </div>
    </div>
  );

  const body = (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-3", feature ? "p-5" : "p-4")}>
      <div className="space-y-1">
        <h3
          className={cn(
            "font-bold leading-tight text-foreground",
            feature ? "text-xl line-clamp-2" : "text-base line-clamp-2",
          )}
        >
          {title}
        </h3>
        <p className="line-clamp-1 text-xs font-medium text-muted-foreground">{subtitle}</p>
      </div>

      {(tags.length > 0 || location || remote) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {location && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-foreground/80">
              <MapPin className="h-3 w-3" />
              {location}
            </span>
          )}
          {remote && (
            <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-foreground/80">
              Remote
            </span>
          )}
          {tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-foreground/80"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {fitReason && (
        <p
          className={cn(
            "rounded-xl border border-energy/20 bg-energy/[0.07] px-3 py-2 text-[12px] leading-snug text-foreground/85",
            feature ? "line-clamp-3" : "line-clamp-2",
          )}
        >
          <span className="font-semibold text-energy">Why you: </span>
          {fitReason}
        </p>
      )}

      <div className="mt-auto space-y-2.5 pt-1">
        {metaLine && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {MetaIcon && <MetaIcon className="h-3 w-3 shrink-0" />}
            <span className="truncate">{metaLine}</span>
          </p>
        )}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            onClick={onCtaClick}
            className="h-9 flex-1 font-semibold transition-colors sm:flex-none sm:px-5"
          >
            {ctaLabel}
          </Button>
          {onSave && (
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0"
              onClick={onSave}
              aria-label={`Save ${title} for later`}
              title="Save for later"
            >
              <Bookmark className="h-4 w-4" />
            </Button>
          )}
          {onDismiss && (
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0 text-muted-foreground"
              onClick={onDismiss}
              aria-label={`Not interested in ${title}`}
              title="Not interested"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <article
      onClick={onCtaClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCtaClick();
        }
      }}
      aria-label={`${title} — ${subtitle}`}
      className={cn(
        "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card",
        "transition-all duration-300 hover:-translate-y-0.5 hover:border-energy/45 hover:shadow-2xl hover:shadow-energy/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        feature && "sm:flex-row",
        className,
      )}
    >
      {cover}
      {body}
    </article>
  );
}
