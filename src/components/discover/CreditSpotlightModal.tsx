import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldCheck, ExternalLink, MapPin, Calendar, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface SpotlightCredit {
  id: string;
  project_name: string | null;
  role: string | null;
  user_id: string;
  thumbnail_url: string | null;
  created_at: string;
}

interface Props {
  credit: SpotlightCredit | null;
  fallbackImage: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Owner {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

interface Details {
  description: string | null;
  location: string | null;
  year: number | null;
  project_type: string | null;
  client_brand: string | null;
  tags: string[] | null;
  url: string | null;
  verification_status: string | null;
}

/**
 * Kretopia-style spotlight modal for a Stamp surfaced in "New on Kretopia".
 * Replaces the old /credit/:id link, which had no route and bounced the user
 * back to Today in a loop.
 */
export const CreditSpotlightModal = ({ credit, fallbackImage, open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [details, setDetails] = useState<Details | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!open || !credit) return;
    let cancelled = false;
    setLoading(true);
    setImgFailed(false);
    setOwner(null);
    setDetails(null);

    Promise.all([
      supabase
        .from("credits")
        .select("description, location, year, project_type, client_brand, tags, url, verification_status")
        .eq("id", credit.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, role")
        .eq("user_id", credit.user_id)
        .maybeSingle(),
    ])
      .then(([d, p]) => {
        if (cancelled) return;
        setDetails((d.data as Details) ?? null);
        setOwner((p.data as Owner) ?? null);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [open, credit]);

  if (!credit) return null;

  const image = credit.thumbnail_url && !imgFailed ? credit.thumbnail_url : fallbackImage;
  const verified = details?.verification_status === "verified";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden gap-0 max-w-lg rounded-3xl border-border">
        <div className="relative aspect-video bg-muted">
          <img
            src={image}
            alt={credit.project_name ?? "Kretopia"}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <Badge className="mb-2 gap-1 text-[10px] uppercase tracking-[0.14em]">
              <ShieldCheck className="h-3 w-3" />
              {verified ? "Verified stamp" : "New stamp"}
            </Badge>
            <h2 className="text-xl font-black leading-tight line-clamp-2">
              {credit.project_name || "Untitled"}
            </h2>
            <p className="text-xs text-muted-foreground">{credit.role || "Credit"}</p>
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the stamp…
            </div>
          ) : (
            <>
              {owner && (
                <button
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/u/${owner.user_id}`);
                  }}
                  className="w-full flex items-center gap-3 rounded-2xl border border-border p-3 text-left hover:border-[hsl(var(--signal-teal))]/40 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={owner.avatar_url || undefined} />
                    <AvatarFallback>{owner.full_name?.[0] ?? "U"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{owner.full_name ?? "Creative"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{owner.role ?? "Creative"}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}

              {details?.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{details.description}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {details?.project_type && <Badge variant="secondary" className="text-[10px]">{details.project_type}</Badge>}
                {details?.client_brand && <Badge variant="secondary" className="text-[10px]">{details.client_brand}</Badge>}
                {details?.location && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <MapPin className="h-3 w-3" />
                    {details.location}
                  </Badge>
                )}
                {details?.year && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Calendar className="h-3 w-3" />
                    {details.year}
                  </Badge>
                )}
                {(details?.tags ?? []).slice(0, 4).map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/production?id=${credit.id}`);
                  }}
                >
                  See the full credit
                </Button>
                {details?.url && (
                  <Button variant="outline" size="icon" asChild>
                    <a href={details.url} target="_blank" rel="noopener noreferrer" aria-label="Open source link">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreditSpotlightModal;
