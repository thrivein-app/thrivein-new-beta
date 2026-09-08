import { Link } from "react-router-dom";
import { MapPin, ShieldCheck, Sparkles, Fingerprint } from "lucide-react";
import { CraftStamp } from "./CraftStamp";
import { passportId as makePassportId } from "@/lib/passportId";
import { cn } from "@/lib/utils";

export interface PassportMiniProfile {
  user_id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  sub_roles?: string[] | null;
  location?: string | null;
  verification_status?: string | null;
  verification_tier?: string | null;
  match_score?: number | null;
  reason?: string | null;
}

/**
 * PassportMiniCard — a Creative Passport in preview form.
 *
 * Used wherever we surface other creatives (Today → "People for you"),
 * so the unit people browse is always a Passport, never a generic profile
 * row: grey→pink passport band, craft stamp, Passport ID, verification.
 */
export function PassportMiniCard({ profile, className }: { profile: PassportMiniProfile; className?: string }) {
  const verified = profile.verification_status === "verified" || profile.verification_tier === "verified";
  const pid = makePassportId(profile.user_id);

  return (
    <Link
      to={`/profile/${profile.user_id}`}
      aria-label={`Open ${profile.full_name || "creator"}'s Creative Passport`}
      className={cn(
        "shrink-0 w-48 flex flex-col rounded-2xl overflow-hidden border border-border bg-card group transition-all",
        "hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <div className="kreto-grey-pink relative px-2.5 py-1.5 flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-[0.15em]">Creative Passport</span>
        {typeof profile.match_score === "number" && (
          <span className="flex items-center gap-0.5 text-[9px] font-bold">
            <Sparkles className="h-2.5 w-2.5" aria-hidden />
            {profile.match_score}%
          </span>
        )}
      </div>

      <div className="relative aspect-[16/10] overflow-hidden shrink-0">
        <div
          className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/10 to-background transition-transform duration-500 group-hover:scale-105"
          style={profile.avatar_url ? { backgroundImage: `url(${profile.avatar_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />
        <CraftStamp profile={profile} size="sm" className="absolute top-2 right-2" />
        <div className="absolute bottom-0 inset-x-0 p-2.5">
          <p className="text-sm font-black leading-tight text-foreground line-clamp-1 flex items-center gap-1">
            {profile.full_name}
            {verified && <ShieldCheck className="h-3 w-3 shrink-0 text-energy" aria-label="Verified" />}
          </p>
          <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
            <Fingerprint className="h-2.5 w-2.5 shrink-0" aria-hidden />
            {pid}
          </span>
        </div>
      </div>

      <div className="mt-auto p-2.5 border-t border-border/60 space-y-0.5">
        <p className="text-[10px] text-muted-foreground line-clamp-1">{profile.role || "Creator"}</p>
        {profile.location && (
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground line-clamp-1">
            <MapPin className="h-2.5 w-2.5 shrink-0" aria-hidden />
            {profile.location}
          </p>
        )}
        {profile.reason && <p className="text-[10px] text-primary line-clamp-2 pt-0.5">{profile.reason}</p>}
      </div>
    </Link>
  );
}
