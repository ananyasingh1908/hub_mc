import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Radio, CheckCircle, XCircle, Ban, RefreshCw, ExternalLink,
  Users, Search,
} from "lucide-react";
import { toast } from "sonner";

type Stream = {
  id: string;
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  liveViewers: number;
  status: string;
  moderatedAt: string | null;
  createdAt: string;
};

type CommunityStream = {
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  liveViewers: number;
  status: "PENDING" | "APPROVED" | "REMOVED" | null;
  featuredId: string | null;
};

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    APPROVED: "text-green-400 bg-[rgba(34,197,94,0.12)]",
    PENDING: "text-yellow-400 bg-[rgba(234,179,8,0.12)]",
    REMOVED: "text-red-400 bg-[rgba(239,68,68,0.12)]",
  };
  return map[s] ?? "text-white/50 bg-white/[0.05]";
};

export default function AdminStreams() {
  const [featured, setFeatured] = useState<Stream[]>([]);
  const [community, setCommunity] = useState<CommunityStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [blacklistChannelId, setBlacklistChannelId] = useState("");
  const [blacklistReason, setBlacklistReason] = useState("");
  const [showBlacklist, setShowBlacklist] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [featRes, commRes] = await Promise.all([
        fetch("/api/admin/streams/featured", { credentials: "include" }),
        fetch("/api/youtube/community-streams"),
      ]);
      const featData = await featRes.json();
      const commData = await commRes.json();
      if (featRes.ok) setFeatured(featData.streams ?? []);
      if (commRes.ok) setCommunity(commData.streams ?? []);
    } catch { toast.error("Failed to load streams"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleApprove = async (stream: CommunityStream) => {
    try {
      const res = await fetch("/api/admin/streams/approve", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: stream.videoId,
          channelId: stream.channelId,
          channelTitle: stream.channelTitle,
          title: stream.title,
          description: stream.description,
          thumbnailUrl: stream.thumbnailUrl,
          liveViewers: stream.liveViewers,
        }),
      });
      if (!res.ok) { toast.error("Failed to approve"); return; }
      toast.success("Stream approved");
      await fetchAll();
    } catch { toast.error("Network error"); }
  };

  const handleRemove = async (videoId: string) => {
    try {
      const res = await fetch("/api/admin/streams/remove", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
      if (!res.ok) { toast.error("Failed to remove"); return; }
      toast.success("Stream removed");
      await fetchAll();
    } catch { toast.error("Network error"); }
  };

  const handleBlacklist = async () => {
    if (!blacklistChannelId.trim()) return;
    try {
      const res = await fetch("/api/admin/streams/blacklist", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: blacklistChannelId.trim(),
          channelTitle: showBlacklist,
          reason: blacklistReason.trim() || null,
        }),
      });
      if (!res.ok) { toast.error("Failed to blacklist"); return; }
      toast.success("Channel blacklisted");
      setBlacklistChannelId("");
      setBlacklistReason("");
      setShowBlacklist(null);
      await fetchAll();
    } catch { toast.error("Network error"); }
  };

  const pendingStreams = community.filter((s) => !s.status || s.status === "PENDING");
  const filteredFeatured = featured.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.channelTitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Stream Moderation</h1>
          <p className="mt-1 text-sm text-white/50">Approve, remove, or blacklist community streams</p>
        </div>
        <button onClick={fetchAll} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition-all hover:bg-white/[0.08] disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {pendingStreams.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-yellow-500/20 bg-[rgba(11,11,11,0.92)] p-6">
          <h2 className="mb-4 text-lg font-black text-white flex items-center gap-2">
            <Radio className="h-5 w-5 text-yellow-400" /> Pending Approval ({pendingStreams.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pendingStreams.map((stream) => (
              <div key={stream.videoId} className="overflow-hidden rounded-2xl border border-white/10 bg-black/60">
                <div className="relative aspect-video">
                  {stream.thumbnailUrl && <img src={stream.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <span className="absolute top-2 left-2 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-400">LIVE</span>
                  {stream.liveViewers > 0 && (
                    <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/70">
                      <Users className="h-3 w-3" /> {stream.liveViewers}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[11px] font-medium text-white/50">{stream.channelTitle}</p>
                  <h4 className="mt-1 text-sm font-bold text-white line-clamp-2">{stream.title}</h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => handleApprove(stream)} className="inline-flex items-center gap-1 rounded-lg border border-green-500/30 bg-green-500/15 px-3 py-1.5 text-[11px] font-semibold text-green-400 transition-all hover:bg-green-500/25">
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button onClick={() => handleRemove(stream.videoId)} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-[11px] font-semibold text-red-400 transition-all hover:bg-red-500/25">
                      <XCircle className="h-3.5 w-3.5" /> Remove
                    </button>
                    <button onClick={() => setShowBlacklist(stream.channelId)} className="inline-flex items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/15 px-3 py-1.5 text-[11px] font-semibold text-orange-400 transition-all hover:bg-orange-500/25">
                      <Ban className="h-3.5 w-3.5" /> Blacklist
                    </button>
                    <a href={`https://www.youtube.com/watch?v=${stream.videoId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/50 transition-all hover:bg-white/[0.08]">
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-black text-white">All Featured Streams</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search streams..." className="h-10 w-56 rounded-xl border border-white/10 bg-black/60 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[rgba(255,138,42,0.45)]" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] font-semibold uppercase tracking-wider text-white/40">
                <th className="pb-3 pr-4">Stream</th>
                <th className="pb-3 pr-4">Channel</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Viewers</th>
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeatured.length === 0 && (
                <tr><td colSpan={6} className="pt-8 text-center text-sm text-white/40">No featured streams found</td></tr>
              )}
              {filteredFeatured.map((s) => (
                <tr key={s.id} className="border-b border-white/[0.04]">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      {s.thumbnailUrl && <img src={s.thumbnailUrl} alt="" className="h-10 w-16 rounded-lg object-cover" />}
                      <span className="font-medium text-white line-clamp-1">{s.title}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-white/60">{s.channelTitle}</td>
                  <td className="py-3 pr-4"><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusBadge(s.status)}`}>{s.status}</span></td>
                  <td className="py-3 pr-4 text-white/60">{s.liveViewers > 0 ? s.liveViewers : "-"}</td>
                  <td className="py-3 pr-4 text-white/40 text-[11px]">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-2">
                      {s.status !== "REMOVED" && (
                        <button onClick={() => handleRemove(s.videoId)} className="rounded-lg border border-red-500/30 bg-red-500/15 px-2.5 py-1 text-[10px] font-semibold text-red-400 transition-all hover:bg-red-500/25">Remove</button>
                      )}
                      <a href={`https://www.youtube.com/watch?v=${s.videoId}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/50 transition-all hover:bg-white/[0.08]">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {showBlacklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowBlacklist(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-4 w-full max-w-md rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.98)] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-white">Blacklist Channel</h3>
            <p className="mt-2 text-sm text-white/50">Channel ID: {showBlacklist}</p>
            <div className="mt-4">
              <label className="text-xs font-medium text-white/60">Reason (optional)</label>
              <input type="text" value={blacklistReason} onChange={(e) => setBlacklistReason(e.target.value)} placeholder="Why is this channel being blacklisted?" className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[rgba(255,138,42,0.45)]" />
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowBlacklist(null)} className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-semibold text-white/60 transition-all hover:bg-white/[0.08]">Cancel</button>
              <button onClick={handleBlacklist} className="flex-1 rounded-xl bg-red-500/80 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-500">Blacklist</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
