import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FirstTimeHint } from "@/components/ui/first-time-hint";
import {
  Globe, Linkedin, Instagram, Sparkles, MapPin, ExternalLink,
  RefreshCw, Mail, Bookmark, X, Send, ShieldCheck, Briefcase, SlidersHorizontal,
} from "lucide-react";
import { ScoutPreferencesDialog } from "./ScoutPreferencesDialog";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import { CarouselPositionDots } from "@/components/ui/glass/CarouselPositionDots";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { KretoMark } from "@/components/brand/KretoMark";
import { SmartWidget } from "@/components/ui/smart-widget";
import { OpportunitiesFeed } from "@/components/circle/OpportunitiesFeed";
import { ScoutedCard } from "./scout/ScoutedCard";
import { inferScoutCategory, inferEngagement, inferSeniority } from "@/lib/scoutCategory";

interface ScoutedGig {
  id: string;
  source: string;
  source_name: string | null;
  source_url: string;
  title: string;
  company: string | null;
  location: string | null;
  remote: boolean;
  description: string | null;
  full_description: string | null;
  image_url: string | null;
  compensation: string | null;
  contact_email: string | null;
  apply_url: string | null;
  fit_score: number;
  fit_reason: string | null;
  scouted_at: string;
  details_fetched_at: string | null;
}

const SOURCE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  web: Globe, linkedin: Linkedin, instagram: Instagram, ats: Briefcase, gigboard: Briefcase,
};

// Scouted listings sometimes store a placeholder string instead of leaving
// compensation null — don't surface those as if they were real information.
const PLACEHOLDER_COMPENSATION = /^(not specified|unspecified|n\/?a|tbd|none|unknown|-)$/i;
const hasRealCompensation = (comp: string | null) => !!comp && !PLACEHOLDER_COMPENSATION.test(comp.trim());

// Lightweight markdown renderer for the brief (headings + paragraphs + lists)
function MiniMarkdown({ md }: { md: string }) {
  const blocks = md.split(/\n{2,}/);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
      {blocks.map((b, i) => {
        const trimmed = b.trim();
        if (/^#{1,6}\s/.test(trimmed)) {
          const text = trimmed.replace(/^#{1,6}\s/, "");
          return <h4 key={i} className="text-sm font-bold text-foreground mt-2">{text}</h4>;
        }
        if (/^[-*]\s/m.test(trimmed)) {
          const items = trimmed.split(/\n/).map((l) => l.replace(/^[-*]\s/, "").trim()).filter(Boolean);
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {items.map((it, j) => <li key={j}>{it.replace(/\*\*(.+?)\*\*/g, "$1")}</li>)}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {trimmed.split(/(\*\*[^*]+\*\*)/).map((seg, k) =>
              seg.startsWith("**") ? <strong key={k}>{seg.slice(2, -2)}</strong> : <span key={k}>{seg}</span>
            )}
          </p>
        );
      })}
    </div>
  );
}

interface ScoutedGigsSectionProps {
  /** When set, only show this many gigs and append a "See all" link to /opportunities. */
  limit?: number;
}

const isThinListing = (g: ScoutedGig) => {
  const desc = (g.full_description || g.description || "").trim();
  if (desc.length < 40 && !g.compensation && !g.company) return true;
  const url = g.apply_url || g.source_url || "";
  try {
    const u = new URL(url);
    const segs = u.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    const last = (segs[segs.length - 1] || "").toLowerCase();
    const generic = ["jobs","careers","search","browse","explore","listings","opportunities","gigs","tags","postings","apply","casting"];
    if (generic.includes(last)) return true;
    if (segs.length < 2 && last.length < 8) return true;
    if (/linkedin\.com$/.test(u.hostname.replace(/^www\./, "")) && !/\/jobs\/view\//.test(u.pathname)) return true;
  } catch { return true; }
  return false;
};

export function ScoutedGigsSection({ limit }: ScoutedGigsSectionProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["scouted-gigs", user?.id];
  const { data: gigs = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await supabase
        .from("scouted_gigs")
        .select("*")
        .eq("target_user_id", user!.id)
        .gt("expires_at", new Date().toISOString())
        .order("fit_score", { ascending: false })
        .order("scouted_at", { ascending: false })
        // No artificial cap on a user's own scouted feed — the compact
        // embed slices client-side via `limit`, the full Scout page shows
        // everything that was actually found for them.
        .limit(200);

      const { data: actions } = await supabase
        .from("scouted_gig_actions")
        .select("scouted_gig_id, action")
        .eq("user_id", user!.id)
        .eq("action", "dismissed");
      const dismissed = new Set((actions || []).map((a) => a.scouted_gig_id));
      return ((data || []) as ScoutedGig[]).filter((g) => !dismissed.has(g.id) && !isThinListing(g));
    },
    enabled: !!user,
  });
  const [scanning, setScanning] = useState(false);
  const [scanElapsed, setScanElapsed] = useState(0);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [openGig, setOpenGig] = useState<ScoutedGig | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [subject, setSubject] = useState("");
  const [drafting, setDrafting] = useState(false);
  // Keeps a written email per gig so reopening a card is instant and free.
  const draftCache = useRef<Record<string, { subject: string; body: string }>>({});
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const reducedMotion = useReducedMotion();

  const scanNow = async () => {
    if (!user) return;
    setScanning(true);
    setScanElapsed(0);
    scanTimerRef.current = setInterval(() => setScanElapsed((s) => s + 1), 1000);

    const { data, error } = await supabase.functions.invoke("scout-gigs", { body: { trigger: "manual" } });

    if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
    setScanning(false);

    if (error) {
      toast({ title: "Scout failed", description: error.message, variant: "destructive" });
      return;
    }
    if (data?.gated) {
      toast({ title: "Weekly Scout limit reached", description: data.message || "Upgrade for daily scans." });
      return;
    }

    const found = data?.found ?? 0;
    const filteredCount = data?.filtered ?? found;
    const inserted = data?.inserted ?? 0;
    if (inserted > 0) {
      toast({
        title: `Found ${inserted} new gig${inserted === 1 ? "" : "s"}`,
        description: `Matched ${filteredCount} across ${data?.queries || 0} searches — ${inserted} weren't already in your list.`,
      });
    } else if (filteredCount > 0) {
      toast({ title: "No new gigs", description: `Matched ${filteredCount} gigs, but you've already seen all of them.` });
    } else {
      toast({ title: "No fresh gigs matched right now", description: "Try again later, or widen your sources under Tune." });
    }
    queryClient.invalidateQueries({ queryKey });
  };

  useEffect(() => () => { if (scanTimerRef.current) clearInterval(scanTimerRef.current); }, []);

  // Scan automatically on first arrival when there's nothing scouted yet --
  // waiting for a manual click was the whole complaint. Gated to once per
  // mount (not on every empty state, e.g. after dismissing everything) so
  // it can't loop or burn through the server-side weekly scan limit.
  const hasAutoScannedRef = useRef(false);
  useEffect(() => {
    if (hasAutoScannedRef.current) return;
    if (loading || scanning || !user || gigs.length > 0) return;
    hasAutoScannedRef.current = true;
    scanNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, gigs.length]);

  const dismiss = async (gigId: string) => {
    if (!user) return;
    await supabase.from("scouted_gig_actions").upsert({ user_id: user.id, scouted_gig_id: gigId, action: "dismissed" });
    queryClient.setQueryData<ScoutedGig[]>(queryKey, (prev) => (prev ?? []).filter((g) => g.id !== gigId));
  };

  const save = async (gigId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    await supabase.from("scouted_gig_actions").upsert({ user_id: user.id, scouted_gig_id: gigId, action: "saved" });
    // Shortlist lives in a separate query cache (ShortlistedGigs.tsx) —
    // without this, saving here can leave that tab showing a stale list
    // for up to its 5min staleTime if it was already visited this session.
    queryClient.invalidateQueries({ queryKey: ["shortlisted-gigs", user.id] });
    toast({ title: "Saved" });
  };

  const openDetail = async (gig: ScoutedGig) => {
    if (!user) return;
    setOpenGig(gig);
    const cached = draftCache.current[gig.id];
    setCoverLetter(cached?.body || "");
    setSubject(cached?.subject || "");
    await supabase.from("scouted_gig_actions").upsert({
      user_id: user.id, scouted_gig_id: gig.id, action: "opened",
    }).then(() => {}, () => {});

    // Enrich if we don't have full_description yet
    if (!gig.full_description) {
      setEnriching(true);
      const { data, error } = await supabase.functions.invoke("scout-gig-detail", {
        body: { scouted_gig_id: gig.id },
      });
      setEnriching(false);
      if (!error && data?.gig) {
        setOpenGig(data.gig as ScoutedGig);
        queryClient.setQueryData<ScoutedGig[]>(queryKey, (prev) =>
          (prev ?? []).map((g) => (g.id === gig.id ? (data.gig as ScoutedGig) : g)),
        );
      }
    }

    // The email should already be written by the time they reach the buttons,
    // personalised to their Passport and to this exact gig.
    if (!cached) draftLetter(gig.id);
  };

  const draftLetter = async (gigId?: string) => {
    const id = gigId || openGig?.id;
    if (!id || !user) return null;
    setDrafting(true);
    const { data, error } = await supabase.functions.invoke("draft-gig-application", {
      body: { scouted_gig_id: id },
    });
    setDrafting(false);
    const body = data?.body || data?.cover_letter;
    if (error || !body) {
      toast({ title: "Couldn't draft the email", variant: "destructive" });
      return null;
    }
    const draft = { subject: data?.subject || "", body: body as string };
    draftCache.current[id] = draft;
    setCoverLetter(draft.body);
    setSubject(draft.subject);
    supabase.from("scouted_gig_actions").upsert({
      user_id: user.id, scouted_gig_id: id, action: "drafted",
    }).then(() => {}, () => {});
    return draft;
  };

  // Opens the mail client with the personalised email already filled in,
  // drafting first if the background draft hasn't landed yet.
  const emailApply = async () => {
    if (!openGig?.contact_email) return;
    trackApplyClick();
    let body = coverLetter;
    let subj = subject;
    if (!body) {
      const draft = await draftLetter(openGig.id);
      body = draft?.body || "";
      subj = draft?.subject || "";
    }
    const finalSubject = subj || `Application — ${openGig.title}${openGig.company ? ` @ ${openGig.company}` : ""}`;
    window.location.href =
      `mailto:${openGig.contact_email}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(body)}`;
  };

  const trackApplyClick = () => {
    if (!user || !openGig) return;
    supabase.from("scouted_gig_actions").upsert({
      user_id: user.id, scouted_gig_id: openGig.id, action: "apply_clicked",
    }).then(() => {}, () => {});
  };

  const markApplied = async () => {
    if (!user || !openGig) return;
    await supabase.from("scouted_gig_actions").upsert({
      user_id: user.id, scouted_gig_id: openGig.id, action: "applied",
      cover_letter: coverLetter, outcome: "pending",
    });
    toast({ title: "Marked as applied", description: "Tap Won / Lost / Ghosted later to track outcome." });
    setOpenGig(null);
  };

  const setOutcome = async (outcome: "won" | "lost" | "ghosted") => {
    if (!user || !openGig) return;
    await supabase.from("scouted_gig_actions").update({ outcome })
      .eq("user_id", user.id).eq("scouted_gig_id", openGig.id).eq("action", "applied");
    toast({ title: outcome === "won" ? "Congrats — booked!" : `Marked ${outcome}` });
    setOpenGig(null);
  };

  // Everything a card needs, derived once: HD cover, a human context line,
  // and the 3-4 facts that actually help someone decide.
  const cardProps = (g: ScoutedGig) => {
    const text = [g.title, g.description, g.full_description, g.company].filter(Boolean).join(" ");
    const category = inferScoutCategory(text);
    const engagement = inferEngagement(text);
    const seniority = inferSeniority(text);
    const subtitle = [category.label, g.company, seniority].filter(Boolean).join(" · ");
    const tags = [
      engagement,
      hasRealCompensation(g.compensation) ? g.compensation!.trim() : null,
    ].filter(Boolean) as string[];
    const Icon = SOURCE_ICON[g.source] || Globe;
    return {
      title: g.title,
      subtitle,
      imageUrl: g.image_url || category.cover,
      fallbackImageUrl: category.cover,
      imageAlt: `Cover image for the ${category.label.toLowerCase()} gig “${g.title}”`,
      tags,
      fitScore: g.fit_score,
      fitReason: g.fit_reason,
      location: g.location,
      remote: g.remote,
      metaIcon: Icon,
      metaLine: `via ${g.source_name || g.source} · ${formatDistanceToNow(new Date(g.scouted_at), { addSuffix: true }).replace("about ", "")}`,
      onCtaClick: () => openDetail(g),
      onSave: (e: React.MouseEvent) => save(g.id, e),
      onDismiss: (e: React.MouseEvent) => { e.stopPropagation(); dismiss(g.id); },
    };
  };

  const renderGigCard = (g: ScoutedGig) => <ScoutedCard {...cardProps(g)} />;


  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-energy" />
            Scouted for you
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Real gigs from the open web — matched to your profile</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setPrefsOpen(true)} title="Tune scout preferences">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="ml-1.5 text-xs hidden sm:inline">Tune</span>
          </Button>
          <Button size="sm" variant="outline" onClick={scanNow} disabled={scanning}>
            {scanning ? <KretoMark size="xs" state="active" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="ml-1.5 text-xs">Scan now</span>
          </Button>
        </div>
      </div>

      <ScoutPreferencesDialog
        open={prefsOpen}
        onOpenChange={setPrefsOpen}
        onSaved={() => { /* user can hit Scan now to re-run */ }}
      />

      {scanning && (
        <SmartWidget interactive={false} className="p-3">
          <div className="flex items-center gap-3">
            <KretoMark size="xs" state="active" className="shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Searching gig boards, LinkedIn, Instagram and ATS pages…</p>
              <p className="text-[11px] text-muted-foreground">{scanElapsed}s elapsed — usually takes 20-40s</p>
            </div>
          </div>
        </SmartWidget>
      )}

      {gigs.length === 0 && !scanning ? (
        // A brand-new user has nothing scouted *yet* — that is a timing
        // artefact, not an empty product. Rather than a dead-end card, show
        // every open gig on Kretopia straight away while the first scan
        // runs, so Scout is never empty on first arrival.
        <div className="space-y-4">
          <Card className="p-4 text-sm text-muted-foreground border-dashed">
            Kreto is still learning what fits you. In the meantime, here is{" "}
            <span className="font-semibold text-foreground">every open gig on Kretopia</span> —
            tap <span className="font-semibold text-foreground">Scan now</span> to add matches from across the web.
          </Card>
          {!limit && <OpportunitiesFeed />}
        </div>
      ) : limit ? (
        <>
        {/* Compact embed (e.g. Today's "More from today") — carousel only, no hero. */}
        <Carousel opts={{ align: "start", dragFree: true, duration: reducedMotion ? 0 : 20 }} className="w-full" aria-label="Scouted gigs">
          <CarouselContent className="-ml-3">
            {gigs.slice(0, limit).map((g) => (
              <CarouselItem key={g.id} className="pl-3 basis-[88%] sm:basis-[58%]">
                {renderGigCard(g)}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        {gigs.length > limit && (
          <a
            href="/opportunities"
            className="mt-1 inline-flex items-center justify-center w-full rounded-xl border border-border bg-card hover:border-energy/40 hover:bg-energy/[0.04] transition-colors px-4 py-3 text-sm font-semibold text-foreground gap-2"
          >
            See all {gigs.length} scouted gigs
            <ExternalLink className="h-3.5 w-3.5 text-energy" />
          </a>
        )}
        </>
      ) : (
        <>
        {/* One strongest opportunity first — gigs are already ordered by fit_score desc. */}
        {gigs[0] && (
          <ScoutedCard
            {...cardProps(gigs[0])}
            variant="feature"
            priorityImage
            ribbon="Strongest match"
            ctaLabel="View full brief"
            className="border-energy/30"
          />
        )}


        {/* Everything else — carousel, not a card wall. */}
        {gigs.length > 1 && (
          <div className="relative">
            <Carousel setApi={setCarouselApi} opts={{ align: "start", dragFree: true, duration: reducedMotion ? 0 : 20 }} className="w-full" aria-label="More scouted gigs">
              <CarouselContent className="-ml-3">
                {gigs.slice(1).map((g) => (
                  <CarouselItem key={g.id} className="pl-3 basis-[88%] sm:basis-[52%] lg:basis-[34%]">
                    {renderGigCard(g)}
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious variant="glass" className="hidden sm:flex -left-3" aria-label="Previous — scouted gigs" />
              <CarouselNext variant="glass" className="hidden sm:flex -right-3" aria-label="Next — scouted gigs" />
            </Carousel>
            <CarouselPositionDots api={carouselApi} label="Scouted gigs" className="mt-2" />
          </div>
        )}
        </>
      )}

      {/* In-app detail modal — compact, centered, no big hero/whitespace */}
      <Dialog open={!!openGig} onOpenChange={(o) => !o && setOpenGig(null)}>
        <DialogContent className="max-w-lg p-0">
          {openGig && (
            <>
              <DialogHeader className="p-4 pb-3 border-b border-border">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-energy/30 via-primary/10 to-background flex items-center justify-center">
                    {openGig.image_url ? (
                      <img src={openGig.image_url} alt={openGig.title} className="h-full w-full object-cover" />
                    ) : (
                      <Briefcase className="h-5 w-5 text-foreground/30" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <DialogTitle className="text-base font-black leading-tight text-foreground line-clamp-2 pr-6">
                      {openGig.title}
                    </DialogTitle>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1 text-xs text-muted-foreground">
                      {openGig.company && <span className="font-medium text-foreground/80">{openGig.company}</span>}
                      {openGig.location && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />{openGig.location}
                        </span>
                      )}
                      {openGig.remote && <Badge variant="outline" className="h-4 text-[9px] px-1">Remote</Badge>}
                      <Badge className="h-4 text-[9px] bg-energy/15 text-energy border-energy/30">{openGig.fit_score}% fit</Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-4 space-y-3.5">
                {openGig.fit_reason && (
                  <div className="rounded-lg bg-energy/[0.06] border border-energy/20 px-3 py-2">
                    <div className="text-[9px] uppercase tracking-wider font-bold text-energy mb-0.5 flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" />
                      Why this fits you
                    </div>
                    <p className="text-xs leading-relaxed text-foreground/90">{openGig.fit_reason}</p>
                  </div>
                )}

                <div>
                  {enriching ? (
                    <div className="space-y-2">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3.5 w-3/4" />
                    </div>
                  ) : openGig.full_description ? (
                    <MiniMarkdown md={openGig.full_description} />
                  ) : openGig.description ? (
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{openGig.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No additional details available.</p>
                  )}
                </div>

                {hasRealCompensation(openGig.compensation) && (
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mr-2">Comp</span>
                    {openGig.compensation}
                  </div>
                )}

                {/* Cover letter — collapsed until drafted, keeps the modal short by default */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold">Your email</h3>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs px-2"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent("thrive-copilot:open", {
                            detail: {
                              prompt: `Help me think through this opportunity: "${openGig.title}"${openGig.company ? ` at ${openGig.company}` : ""}. What's the strongest angle for my pitch?`,
                              context: {
                                scouted_gig_id: openGig.id,
                                opportunity_title: openGig.title,
                                opportunity_source: openGig.source_name || openGig.source,
                                opportunity_source_url: openGig.source_url,
                              },
                            },
                          }));
                        }}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Open in Kreto
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => draftLetter()} disabled={drafting}>
                        {drafting ? <KretoMark size="xs" state="active" className="mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        {coverLetter ? "Rewrite" : "Draft"}
                      </Button>
                    </div>
                  </div>
                  {drafting ? (
                    <div className="space-y-1.5"><Skeleton className="h-3.5 w-full" /><Skeleton className="h-3.5 w-3/4" /></div>
                  ) : coverLetter ? (
                    <div className="space-y-1.5">
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Subject"
                        className="h-8 text-sm"
                        aria-label="Email subject"
                      />
                      <Textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={8} className="text-sm" />
                      <p className="text-[10px] text-muted-foreground">
                        Written for you and this gig — edit anything before sending.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Footer actions */}
              <div className="p-4 pt-0 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {openGig.contact_email ? (
                    <Button size="sm" variant="default" onClick={emailApply} disabled={drafting}>
                      <Mail className="h-3.5 w-3.5 mr-1.5" />Email apply
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="default" onClick={trackApplyClick}>
                      <a href={openGig.apply_url || openGig.source_url} target="_blank" rel="noopener noreferrer">
                        <Send className="h-3.5 w-3.5 mr-1.5" />Apply on site
                      </a>
                    </Button>
                  )}
                  <Button size="sm" onClick={markApplied} variant="outline">
                    <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />I applied
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setOutcome("won")}>🎉 Won</Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setOutcome("lost")}>Lost</Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setOutcome("ghosted")}>Ghosted</Button>
                </div>
                <a
                  href={openGig.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition pt-0.5"
                >
                  <ExternalLink className="h-3 w-3" />
                  Verify on {openGig.source_name || openGig.source}
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Explainer, not the headline -- scanning now happens on its own and
          the results above are the point of the page, so "how it works"
          drops to a footnote instead of standing between arrival and them. */}
      <FirstTimeHint
        storageKey="gigs.scouted-explainer"
        title="How scouting works"
        description="Kreto scans gig boards, LinkedIn, Instagram and ATS pages automatically and ranks results by fit. Tap a card to read the full brief inside the app."
        tone="energy"
      />
    </div>
  );
}
