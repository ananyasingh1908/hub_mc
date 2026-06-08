import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Star, Send, LoaderCircle, AlertCircle, CheckCircle,
  Youtube, MessageSquare, ExternalLink, Play, User,
  Dot, Calendar, Radio, Users, Tv,
} from "lucide-react";
import { toast } from "sonner";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";
import { useAuthSession } from "@/lib/auth/client";

type Review = {
  id: string; minecraftUsername: string; avatarUrl: string | null;
  rating: number; title: string; message: string; createdAt: string;
};
type StarBreakdown = { 5: number; 4: number; 3: number; 2: number; 1: number };

type YouTubeChannel = {
  connected: boolean; channelId: string | null; channelTitle: string | null;
  channelAvatar?: string | null; subscriberCount?: string;
  videoCount?: string; viewCount?: string;
};
type YouTubeVideo = { videoId: string; title: string; description: string; thumbnail: string; publishedAt: string; channelTitle: string };
type YouTubeLive = { connected: boolean; isLive: boolean; livestream: { videoId: string; title: string; thumbnail: string; channelTitle: string; liveBroadcastContent: string } | null };

type CommunityStream = {
  videoId: string; channelId: string; channelTitle: string;
  title: string; description: string; thumbnailUrl: string;
  liveViewers: number;
  status: "PENDING" | "APPROVED" | "REMOVED" | null;
  featuredId: string | null;
};

type DiscordStatus = {
  connected: boolean; serverId: string | null; invite: string | null;
  serverName?: string | null; onlineCount?: number;
  members?: Array<{ id: string; username: string; discriminator: string; avatar: string | null; status: string }>;
};
type DiscordEvent = { id: string; name: string; description: string; scheduledStart: string; scheduledEnd: string | null; memberCount: number; status: string; image: string | null };

function StarRating({ rating, size = 20 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${i <= rating ? "fill-[var(--hub-orange)] text-[var(--hub-orange)]" : "text-white/20]"}`} width={size} height={size} />
      ))}
    </div>
  );
}

function InteractiveStarRating({ value, onChange }: { value: number; onChange: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} className="transition-transform duration-150 hover:scale-125">
          <Star className={i <= (hover || value) ? "fill-[var(--hub-orange)] text-[var(--hub-orange)]" : "text-white/20]"} width={28} height={28} />
        </button>
      ))}
    </div>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-400">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
      LIVE
    </span>
  );
}

function SectionHeader({ label, title, highlight }: { label: string; title: string; highlight: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="mb-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.45em] text-[var(--hub-blue)]">{label}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
        {title} <span className="text-[var(--hub-orange)]">{highlight}</span>
      </h2>
    </motion.div>
  );
}

export default function LivestreamPage() {
  const { data: session, isPending: sessionLoading } = useAuthSession();

  const [ytChannel, setYtChannel] = useState<YouTubeChannel | null>(null);
  const [ytVideos, setYtVideos] = useState<YouTubeVideo[]>([]);
  const [ytLive, setYtLive] = useState<YouTubeLive | null>(null);
  const [ytLoading, setYtLoading] = useState(true);

  const [communityStreams, setCommunityStreams] = useState<CommunityStream[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);

  const [discordStatus, setDiscordStatus] = useState<DiscordStatus | null>(null);
  const [discordEvents, setDiscordEvents] = useState<DiscordEvent[]>([]);
  const [discordLoading, setDiscordLoading] = useState(true);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [overallRating, setOverallRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [starBreakdown, setStarBreakdown] = useState<StarBreakdown>({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewForm, setReviewForm] = useState({ title: "", message: "", rating: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchYouTube = async () => {
    try {
      const [chan, vids, live] = await Promise.all([
        fetch("/api/youtube/status").then((r) => r.json()),
        fetch("/api/youtube/videos").then((r) => r.json()),
        fetch("/api/youtube/livestream").then((r) => r.json()),
      ]);
      setYtChannel(chan);
      setYtVideos(vids.videos ?? []);
      setYtLive(live);
    } catch {}
    finally { setYtLoading(false); }
  };

  const fetchCommunityStreams = async () => {
    try {
      const res = await fetch("/api/youtube/community-streams");
      const data = await res.json();
      setCommunityStreams(data.streams ?? []);
    } catch {}
    finally { setCommunityLoading(false); }
  };

  const fetchDiscord = async () => {
    try {
      const [stat, evts] = await Promise.all([
        fetch("/api/discord/status").then((r) => r.json()),
        fetch("/api/discord/events").then((r) => r.json()),
      ]);
      setDiscordStatus(stat);
      setDiscordEvents(evts.events ?? []);
    } catch {}
    finally { setDiscordLoading(false); }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/server-reviews");
      const data = await res.json();
      setReviews(data.reviews ?? []);
      setOverallRating(data.overallRating ?? 0);
      setTotalReviews(data.totalReviews ?? 0);
      setStarBreakdown(data.starBreakdown ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
    } catch {}
    finally { setLoadingReviews(false); }
  };

  useEffect(() => { fetchYouTube(); fetchCommunityStreams(); fetchDiscord(); fetchReviews(); }, []);

  useEffect(() => {
    // Server cache refreshes every 10-15 min, so no need for aggressive polling
    const interval = setInterval(fetchCommunityStreams, 120_000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!reviewForm.rating || reviewForm.rating < 1 || reviewForm.rating > 5) { setSubmitError("Select a star rating."); return; }
    if (!reviewForm.title.trim()) { setSubmitError("Enter a review title."); return; }
    if (!reviewForm.message.trim()) { setSubmitError("Write your review message."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/server-reviews/submit", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewForm),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data?.error ?? "Failed to submit review."); return; }
      toast.success("Review submitted!");
      setReviewForm({ title: "", message: "", rating: 0 });
      await fetchReviews();
    } catch { setSubmitError("Network error. Try again."); }
    finally { setSubmitting(false); }
  };

  const isCustomer = !sessionLoading && session?.user?.minecraftUsername;
  const ytConnected = ytChannel?.connected;
  const dsConnected = discordStatus?.connected;
  const discordInvite = discordStatus?.invite;

  return (
    <StorePageLayout>
      <section className="relative min-h-screen overflow-hidden px-6 pt-32 pb-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-0 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(62,162,255,0.15),transparent_68%)] blur-3xl" />
          <div className="absolute right-0 bottom-0 h-[35rem] w-[35rem] rounded-full bg-[radial-gradient(circle,rgba(255,138,42,0.12),transparent_70%)] blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-[var(--hub-blue)]">Community & Live</p>
            <h1 className="mt-5 text-5xl font-black tracking-tight text-white md:text-7xl">
              HUBMC <span className="text-[var(--hub-orange)]">Live</span>
            </h1>
            <p className="mt-4 mx-auto max-w-2xl text-lg text-white/56">
              Watch our streams, join our Discord, and share your experience.
            </p>
          </motion.div>

          {/* ─── YOUTUBE SECTION ─── */}
          <SectionHeader label="YouTube" title="Live Streams &" highlight="Videos" />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="mb-8 rounded-[28px] border border-red-500/20 bg-[rgba(11,11,11,0.92)] p-6 md:p-8" style={{ boxShadow: "0 28px 80px -40px rgba(239,68,68,0.25)" }}>
            {ytLoading ? (
              <div className="flex items-center justify-center py-12"><LoaderCircle className="h-6 w-6 animate-spin text-white/30" /></div>
            ) : !ytConnected ? (
              <div className="text-center py-10">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] text-white/20"><Youtube className="h-8 w-8" /></div>
                <h3 className="mt-5 text-xl font-black text-white">YouTube</h3>
                <p className="mt-2 text-sm text-white/50 max-w-md mx-auto">
                  No videos or livestreams available right now
                </p>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center gap-4 border-b border-white/10 pb-6 mb-6">
                  {ytChannel?.channelAvatar && <img src={ytChannel.channelAvatar} alt="" className="h-14 w-14 rounded-full" />}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-black text-white">{ytChannel?.channelTitle ?? "YouTube Channel"}</h3>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-white/50">
                      <span>{Number(ytChannel?.subscriberCount ?? 0).toLocaleString()} subscribers</span>
                      <span>{Number(ytChannel?.videoCount ?? 0).toLocaleString()} videos</span>
                    </div>
                  </div>
                  <a href={`https://youtube.com/channel/${ytChannel?.channelId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-400 transition-all duration-300 hover:bg-red-500/25 hover:text-white">
                    <Youtube className="h-4 w-4" /> Visit Channel
                  </a>
                </div>

                {ytLive?.isLive && ytLive?.livestream ? (
                  <div className="mb-6 overflow-hidden rounded-2xl border border-red-500/20 bg-black/60">
                    <div className="relative aspect-video">
                      <img src={ytLive.livestream.thumbnail} alt={ytLive.livestream.title} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute top-4 left-4"><LiveBadge /></div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <h4 className="text-lg font-bold text-white line-clamp-2">{ytLive.livestream.title}</h4>
                      </div>
                    </div>
                    <div className="p-4">
                      <a href={`https://www.youtube.com/watch?v=${ytLive.livestream.videoId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-500">
                        <Play className="h-4 w-4 fill-white" /> Watch Live
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] text-white/30"><Play className="h-6 w-6" /></div>
                    <p className="mt-3 text-sm text-white/50">No live stream right now — check back later!</p>
                  </div>
                )}

                {ytVideos.length > 0 && (
                  <div>
                    <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">Latest Uploads</h4>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {ytVideos.slice(0, 6).map((video) => (
                        <a key={video.videoId} href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-2xl border border-white/10 bg-black/60 transition-all duration-300 hover:border-red-500/30 hover:bg-black/80">
                          <div className="relative aspect-video overflow-hidden">
                            <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          </div>
                          <div className="p-3">
                            <h5 className="text-sm font-bold text-white line-clamp-2 group-hover:text-red-400 transition-colors">{video.title}</h5>
                            {video.publishedAt && <p className="mt-1 text-xs text-white/40">{new Date(video.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {ytVideos.length === 0 && (
                  <div className="text-center py-8">
                    <Youtube className="mx-auto h-8 w-8 text-white/20" />
                    <p className="mt-3 text-sm text-white/50">No videos uploaded yet</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* ─── COMMUNITY STREAMS ─── */}
          <SectionHeader label="Community" title="Live" highlight="Streams" />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="mb-8 rounded-[28px] border border-[var(--hub-orange)]/20 bg-[rgba(11,11,11,0.92)] p-6 md:p-8" style={{ boxShadow: "0 28px 80px -40px rgba(255,138,42,0.25)" }}>
            {communityLoading ? (
              <div className="flex items-center justify-center py-12"><LoaderCircle className="h-6 w-6 animate-spin text-white/30" /></div>
            ) : (
              <div>
                {(() => {
                  const featured = communityStreams.filter((s) => s.status === "APPROVED");
                  const others = communityStreams.filter((s) => s.status !== "APPROVED");
                  return (
                    <>
                      {featured.length > 0 && (
                        <div className="mb-8">
                          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60 flex items-center gap-2">
                            <Radio className="h-4 w-4 text-[var(--hub-orange)]" /> Featured Stream
                          </h3>
                          <div className="overflow-hidden rounded-2xl border border-[var(--hub-orange)]/20 bg-black/60">
                            <div className="relative aspect-video">
                              <img src={featured[0].thumbnailUrl} alt={featured[0].title} className="h-full w-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                              <span className="absolute top-3 left-3"><LiveBadge /></span>
                              {featured[0].liveViewers > 0 && (
                                <span className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs text-white/80">
                                  <Users className="h-3.5 w-3.5" /> {featured[0].liveViewers.toLocaleString()} watching
                                </span>
                              )}
                              <div className="absolute bottom-3 left-3 right-3">
                                <p className="text-xs text-white/50">{featured[0].channelTitle}</p>
                                <h4 className="mt-0.5 text-lg font-bold text-white line-clamp-2">{featured[0].title}</h4>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-4">
                              <a href={`https://www.youtube.com/watch?v=${featured[0].videoId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-500">
                                <Play className="h-4 w-4 fill-white" /> Watch Live
                              </a>
                              <a href={`https://www.youtube.com/channel/${featured[0].channelId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/60 transition-all hover:bg-white/[0.08]">
                                <ExternalLink className="h-4 w-4" /> Channel
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                      {others.length > 0 && (
                        <div>
                          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60 flex items-center gap-2">
                            <Tv className="h-4 w-4" /> Community Streams {featured.length > 0 && `(${others.length})`}
                          </h3>
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {others.slice(0, 9).map((stream) => (
                              <a key={stream.videoId} href={`https://www.youtube.com/watch?v=${stream.videoId}`} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-2xl border border-white/10 bg-black/60 transition-all duration-300 hover:border-[var(--hub-orange)]/30 hover:bg-black/80">
                                <div className="relative aspect-video overflow-hidden">
                                  <img src={stream.thumbnailUrl} alt={stream.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                  <span className="absolute top-2 left-2"><LiveBadge /></span>
                                </div>
                                <div className="p-3">
                                  <p className="text-[11px] font-medium text-white/50">{stream.channelTitle}</p>
                                  <h5 className="mt-1 text-sm font-bold text-white line-clamp-2 group-hover:text-[var(--hub-orange)] transition-colors">{stream.title}</h5>
                                  {stream.liveViewers > 0 && (
                                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-white/40">
                                      <Users className="h-3 w-3" /> {stream.liveViewers.toLocaleString()} watching
                                    </p>
                                  )}
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {communityStreams.length === 0 && (
                        <div className="text-center py-10">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] text-white/20"><Radio className="h-8 w-8" /></div>
                          <h3 className="mt-5 text-xl font-black text-white">No Community Streams</h3>
                          <p className="mt-2 text-sm text-white/50 max-w-md mx-auto">
                            No HUBMC-related livestreams found right now. Stream with #HUBMC to be featured!
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </motion.div>

          {/* ─── DISCORD SECTION ─── */}
          <SectionHeader label="Discord" title="Join Our" highlight="Community" />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="mb-16 rounded-[28px] border border-indigo-500/20 bg-[rgba(11,11,11,0.92)] p-6 md:p-8" style={{ boxShadow: "0 28px 80px -40px rgba(99,102,241,0.25)" }}>
            {discordLoading ? (
              <div className="flex items-center justify-center py-12"><LoaderCircle className="h-6 w-6 animate-spin text-white/30" /></div>
            ) : !dsConnected ? (
              <div className="text-center py-10">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] text-indigo-400"><MessageSquare className="h-8 w-8" /></div>
                <h3 className="mt-5 text-xl font-black text-white">Join Our Discord Community</h3>
                <p className="mt-2 text-sm text-white/50 max-w-md mx-auto">
                  Connect with other players, get support, and stay updated on events.
                </p>
                {discordInvite && (
                  <a href={discordInvite} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-400">
                    <ExternalLink className="h-4 w-4" /> Join Discord
                  </a>
                )}
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center gap-4 border-b border-white/10 pb-6 mb-6">
                  <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-500"><MessageSquare className="h-6 w-6" /></div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-black text-white">{discordStatus?.serverName ?? "Discord Server"}</h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
                      <span className="inline-flex items-center gap-1"><Dot className={`h-4 w-4 ${(discordStatus?.onlineCount ?? 0) > 0 ? "text-green-400" : "text-white/30]"}`} />{(discordStatus?.onlineCount ?? 0).toLocaleString()} online</span>
                    </div>
                  </div>
                  {discordStatus?.invite && (
                    <a href={discordStatus.invite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-5 py-2.5 text-sm font-semibold text-indigo-400 transition-all duration-300 hover:bg-indigo-500/25 hover:text-white">
                      <ExternalLink className="h-4 w-4" /> Join Discord
                    </a>
                  )}
                </div>

                {discordStatus?.members && discordStatus.members.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">Online Members</h4>
                    <div className="flex flex-wrap gap-2">
                      {discordStatus.members.slice(0, 12).map((member) => (
                        <div key={member.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70">
                          {member.avatar ? <img src={member.avatar} alt="" className="h-6 w-6 rounded-full" /> : <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400"><User className="h-3 w-3" /></div>}
                          <span>{member.username}</span>
                          <Dot className={`h-4 w-4 ${member.status === "online" ? "text-green-400" : "text-white/20]"}`} />
                        </div>
                      ))}
                      {(discordStatus.members.length > 12) && <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/40">+{discordStatus.members.length - 12} more</div>}
                    </div>
                  </div>
                )}

                {discordEvents.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">Upcoming Events</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {discordEvents.slice(0, 4).map((event) => (
                        <div key={event.id} className="rounded-2xl border border-white/10 bg-black/60 p-4">
                          {event.image && <img src={event.image} alt="" className="mb-3 h-32 w-full rounded-xl object-cover" />}
                          <h5 className="font-bold text-white">{event.name}</h5>
                          {event.description && <p className="mt-1 text-xs text-white/50 line-clamp-2">{event.description}</p>}
                          <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
                            {event.scheduledStart && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(event.scheduledStart).toLocaleDateString()}</span>}
                            {event.memberCount > 0 && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{event.memberCount}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!discordStatus?.members || discordStatus.members.length === 0) && discordEvents.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="mx-auto h-8 w-8 text-white/20" />
                    <p className="mt-3 text-sm text-white/50">No members online right now</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* ─── SERVER REVIEWS ─── */}
          <SectionHeader label="Community Voices" title="Server" highlight="Reviews" />

          <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
                <div className="text-center">
                  <div className="text-5xl font-black text-white">{overallRating}</div>
                  <div className="mt-2 flex justify-center"><StarRating rating={Math.round(overallRating)} size={22} /></div>
                  <p className="mt-2 text-sm text-white/46">{totalReviews} review{totalReviews !== 1 ? "s" : ""}</p>
                </div>
                <div className="mt-6 space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = starBreakdown[star as keyof StarBreakdown];
                    const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-3 text-sm">
                        <span className="w-4 text-right text-white/50">{star}</span>
                        <Star className="h-3.5 w-3.5 text-[var(--hub-orange)]" />
                        <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full bg-[var(--hub-orange)] transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-white/40">{count}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 pt-6 border-t border-white/8">
                  {isCustomer ? (
                    <div className="text-sm text-white/60">
                      <CheckCircle className="inline h-4 w-4 text-green-400 mr-1" />
                      Logged in as <span className="font-semibold text-white">{session.user.minecraftUsername}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-white/40">
                      <AlertCircle className="inline h-4 w-4 text-[var(--hub-orange)] mr-1" />
                      Login to leave a review
                    </div>
                  )}
                </div>
              </motion.div>

              {isCustomer && (
                <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} onSubmit={handleSubmitReview} className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
                  <h3 className="text-lg font-black text-white">Write a Review</h3>
                  <div className="mt-4">
                    <label className="text-sm font-medium text-white/72">Rating</label>
                    <div className="mt-2"><InteractiveStarRating value={reviewForm.rating} onChange={(r) => { setReviewForm({ ...reviewForm, rating: r }); if (submitError) setSubmitError(null); }} /></div>
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-medium text-white/72">Title</label>
                    <input type="text" value={reviewForm.title} onChange={(e) => { setReviewForm({ ...reviewForm, title: e.target.value }); if (submitError) setSubmitError(null); }} placeholder="Summarize your experience" disabled={submitting} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[rgba(255,138,42,0.45)] focus:ring-1 focus:ring-[rgba(255,138,42,0.3)] disabled:cursor-not-allowed disabled:opacity-50" />
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-medium text-white/72">Review</label>
                    <textarea value={reviewForm.message} onChange={(e) => { setReviewForm({ ...reviewForm, message: e.target.value }); if (submitError) setSubmitError(null); }} placeholder="Tell others about your time on HUBMC..." rows={4} disabled={submitting} className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[rgba(255,138,42,0.45)] focus:ring-1 focus:ring-[rgba(255,138,42,0.3)] disabled:cursor-not-allowed disabled:opacity-50 resize-none" />
                  </div>
                  {submitError && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--hub-orange)]/20 bg-[var(--hub-orange)]/8 px-3 py-2 text-sm text-white/82">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--hub-orange)]" />
                      <span>{submitError}</span>
                    </motion.div>
                  )}
                  <button type="submit" disabled={submitting} className={`mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-300 ${submitting ? "cursor-not-allowed bg-white/8 text-white/40" : "bg-[var(--hub-orange)] text-black hover:-translate-y-0.5 hover:bg-[#ff9a46]"}`}>
                    {submitting ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Submitting...</> : <><Send className="h-4 w-4" /> Submit Review</>}
                  </button>
                </motion.form>
              )}
            </div>

            <div>
              {loadingReviews ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)]" />)}
                </div>
              ) : reviews.length === 0 ? (
                <div className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-10 text-center">
                  <Star className="mx-auto h-10 w-10 text-white/20" />
                  <h3 className="mt-4 text-xl font-black text-white">No reviews yet</h3>
                  <p className="mt-2 text-sm text-white/50">Be the first to share your HUBMC experience!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review, i) => (
                    <motion.div key={review.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.04 }} className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-5 md:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{review.minecraftUsername}</span>
                            <StarRating rating={review.rating} size={14} />
                          </div>
                          <h4 className="mt-2 font-bold text-white/90">{review.title}</h4>
                          <p className="mt-1 text-sm leading-6 text-white/56">{review.message}</p>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-white/30">
                        {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </StorePageLayout>
  );
}
