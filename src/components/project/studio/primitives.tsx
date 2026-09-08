/**
 * Studio primitives — the single grammar every Studio surface renders with.
 *
 * Before this file, each of the ~40 Studio sections hand-rolled its own
 * header, its own skeleton, its own "nothing here yet" block and its own
 * error copy, so the same four states looked different in every section
 * (different radii, different paddings, different tags for the same visual
 * role, different retry affordances — or no retry at all).
 *
 * Five primitives, one visual language:
 *   <StudioSection>       section frame: eyebrow, title, optional action
 *   <StudioCard>          the flat bordered surface everything sits on
 *   <StudioLoadingState>  skeleton rows, never a bare spinner
 *   <StudioEmptyState>    what this is + the one action that fills it
 *   <StudioErrorState>    plain-language failure + retry
 *
 * `<StudioSection>` accepts `loading` / `error` / `isEmpty` directly, so a
 * section renders the right state without repeating the branch:
 *
 *   <StudioSection title="Deliverables" loading={isLoading} error={error}
 *                  isEmpty={!items.length} empty={{ title: "…" }}>
 *     {items.map(…)}
 *   </StudioSection>
 */
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ card */

interface StudioCardProps {
  children: ReactNode;
  className?: string;
  /** Remove padding — for cards whose child manages its own edges (lists, media). */
  flush?: boolean;
  /** Subtle interactive affordance for cards that are themselves clickable. */
  interactive?: boolean;
}

export function StudioCard({ children, className, flush, interactive }: StudioCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card overflow-hidden",
        flush ? "" : "p-4 sm:p-5",
        interactive && "transition-colors hover:border-primary/40 hover:bg-accent/30",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- loading */

interface StudioLoadingStateProps {
  /** Number of skeleton rows. Match the real content's typical length. */
  rows?: number;
  /** Render rows as cards rather than lines — for grids and card lists. */
  variant?: "list" | "cards";
  className?: string;
  label?: string;
}

export function StudioLoadingState({
  rows = 3,
  variant = "list",
  className,
  label = "Loading",
}: StudioLoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(variant === "cards" ? "grid gap-3 sm:grid-cols-2" : "space-y-2.5", className)}
    >
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className={cn(
            "animate-pulse rounded-xl bg-muted/50",
            variant === "cards" ? "h-24" : "h-12",
          )}
        />
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- empty */

interface StudioEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Tighter block for empties nested inside an already-small card. */
  compact?: boolean;
}

export function StudioEmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: StudioEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 text-center",
        compact ? "px-4 py-6" : "px-6 py-10",
        className,
      )}
    >
      {icon && <div className="mb-1 text-muted-foreground/60">{icon}</div>}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-xs text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ----------------------------------------------------------------- error */

interface StudioErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  compact?: boolean;
}

export function StudioErrorState({
  title = "That didn't load",
  description = "Something went wrong on our side. Try again in a moment.",
  onRetry,
  retryLabel = "Try again",
  className,
  compact,
}: StudioErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 text-center",
        compact ? "px-4 py-6" : "px-6 py-8",
        className,
      )}
    >
      <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
      {onRetry && (
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- section */

interface StudioSectionProps {
  title: ReactNode;
  eyebrow?: string;
  description?: ReactNode;
  icon?: ReactNode;
  /** One dominant action per section — never a row of equal-weight buttons. */
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Render inside a StudioCard frame (default) or bare, for flat mobile lists. */
  framed?: boolean;
  id?: string;

  /* --- state, so callers never re-implement the same branch --- */
  loading?: boolean;
  loadingRows?: number;
  loadingVariant?: "list" | "cards";
  error?: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  empty?: StudioEmptyStateProps;
}

export function StudioSection({
  title,
  eyebrow,
  description,
  icon,
  action,
  children,
  className,
  framed = true,
  id,
  loading,
  loadingRows,
  loadingVariant,
  error,
  onRetry,
  isEmpty,
  empty,
}: StudioSectionProps) {
  const body = loading ? (
    <StudioLoadingState rows={loadingRows} variant={loadingVariant} />
  ) : error ? (
    <StudioErrorState
      description={
        typeof error === "string"
          ? error
          : (error as { message?: string })?.message || undefined
      }
      onRetry={onRetry}
      compact
    />
  ) : isEmpty && empty ? (
    <StudioEmptyState {...empty} compact />
  ) : (
    children
  );

  const header = (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <div className={cn("flex items-center", icon ? "gap-2" : "")}>
          {icon && <span className="shrink-0 text-primary">{icon}</span>}
          <h2 className="text-base font-semibold leading-tight text-foreground">{title}</h2>
        </div>
        {description && (
          <p className="mt-1 max-w-prose text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );

  const inner = (
    <>
      {header}
      {body}
    </>
  );

  if (!framed) {
    return (
      <section id={id} className={cn("px-4 py-4", className)}>
        {inner}
      </section>
    );
  }

  return (
    <section id={id} className={className}>
      <StudioCard>{inner}</StudioCard>
    </section>
  );
}

export default StudioSection;
