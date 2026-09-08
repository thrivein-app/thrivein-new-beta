import { Button } from "@/components/ui/button";
import { HoloCard } from "@/components/passport/HoloCard";
import { BrandLogo } from "@/components/BrandLogo";
import { KretopiaQRCode } from "@/components/brand/KretopiaQRCode";
import { Ticket, Check, Calendar, MapPin, CalendarPlus, Navigation } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EventPassCardProps {
  eventTitle: string;
  guestName?: string | null;
  startTime: string;
  venueName?: string | null;
  venueAddress?: string | null;
  token: string | null;
  loading: boolean;
  checkedIn?: boolean;
  onDownloadCalendar?: () => void;
  directionsHref?: string | null;
  className?: string;
}

/**
 * The Kretopia-branded event pass — same holographic-card, ambient-glow and
 * scan-line language as the rest of the app (HoloCard, KretopiaHero's
 * search treatment), with the Kretopia mark embedded straight into the QR
 * code so the pass reads as unmistakably Kretopia even when it's just a
 * photo of a screen at a door. The QR is the dominant element on the card
 * by design — everything else (venue, calendar, directions) sits below it.
 */
export const EventPassCard = ({
  eventTitle,
  guestName,
  startTime,
  venueName,
  venueAddress,
  token,
  loading,
  checkedIn = false,
  onDownloadCalendar,
  directionsHref,
  className,
}: EventPassCardProps) => {
  return (
    <HoloCard className={className}>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        {/* Header — dark Kretopia plate, same signature as the landing hero / feature headers */}
        <div className="relative overflow-hidden bg-background px-5 pb-6 pt-5 text-center">
          <div aria-hidden className="passport-qr-header-glow pointer-events-none absolute inset-0 ai-ambient-breathe" />
          <div className="relative flex flex-col items-center">
            <BrandLogo size="sm" lockup />
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--energy)/0.25)] bg-[hsl(var(--energy)/0.1)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--energy))]">
              <Ticket className="h-3 w-3" /> Your pass
            </div>
            <h2 className="mt-2 text-xl font-bold leading-tight text-foreground">{eventTitle}</h2>
            {guestName && <p className="mt-0.5 text-sm text-muted-foreground">{guestName}</p>}
          </div>
        </div>

        {/* Perforated edge */}
        <div className="relative h-3 bg-card">
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background" />
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background" />
          <div className="border-t border-dashed border-border mx-3 mt-1.5" />
        </div>

        {/* QR — the priority element on the card, framed with a restrained ambient glow. */}
        <div className="relative px-5 pt-5 pb-2">
          <div aria-hidden className="passport-qr-glow pointer-events-none absolute -inset-x-2 top-2 h-64 rounded-[32px] blur-2xl opacity-70 ai-ambient-breathe" />
          <div className="relative flex flex-col items-center">
            {loading ? (
              <div className="flex h-[264px] w-[264px] items-center justify-center rounded-2xl border border-border bg-muted/40">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[hsl(var(--energy))] shadow-[0_0_16px_hsl(var(--energy)/0.65)]" aria-label="Loading pass" />
              </div>
            ) : token ? (
              <>
                <KretopiaQRCode value={token} ariaLabel={`Entry QR code for ${eventTitle}`} />
                {checkedIn ? (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                    <Check className="h-4 w-4" /> You're checked in
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground text-center">
                    Show this to the host at the door
                  </p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground/70 font-mono tracking-wide">
                  {token.slice(0, 8)}…{token.slice(-4)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                We couldn't find your pass. Try refreshing the event.
              </p>
            )}
          </div>
        </div>

        {/* Event meta — same icon-tile pattern as the event detail page */}
        <div className="px-5 pb-5 pt-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">
              {format(new Date(startTime), "EEE, MMM d · h:mm a")}
            </span>
          </div>
          {venueName && (
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{venueName}</p>
                {venueAddress && <p className="text-xs text-muted-foreground line-clamp-1">{venueAddress}</p>}
              </div>
            </div>
          )}

          {(onDownloadCalendar || directionsHref) && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {onDownloadCalendar && (
                <Button onClick={onDownloadCalendar} variant="secondary" size="sm">
                  <CalendarPlus className="h-4 w-4 mr-1.5" /> Calendar
                </Button>
              )}
              {directionsHref ? (
                <a href={directionsHref} target="_blank" rel="noopener noreferrer" className={cn(!onDownloadCalendar && "col-span-2")}>
                  <Button variant="secondary" size="sm" className="w-full">
                    <Navigation className="h-4 w-4 mr-1.5" /> Directions
                  </Button>
                </a>
              ) : onDownloadCalendar ? (
                <Button variant="secondary" size="sm" disabled>
                  <Navigation className="h-4 w-4 mr-1.5" /> Directions
                </Button>
              ) : null}
            </div>
          )}

          <p className="pt-2 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/50">
            Kretopia · Where Creativity Lives
          </p>
        </div>
      </div>
    </HoloCard>
  );
};

export default EventPassCard;
