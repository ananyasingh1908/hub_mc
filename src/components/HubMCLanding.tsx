import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence } from "framer-motion";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { Send, CheckCircle, HelpCircle, MessageCircle, Mail, Clock, Sword, Package, Trophy, Users, Shield, Settings, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import heroImg from "@/assets/last_home_hub.png";
import logoImg from "@/assets/hubmc-logo.png";
import { HubMCNavbar } from "@/components/commerce/HubMCNavbar";

function useElementHeight<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frameId = 0;

    const updateHeight = () => {
      frameId = 0;
      setHeight(element.getBoundingClientRect().height);
    };

    const scheduleUpdate = () => {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame(updateHeight);
    };

    scheduleUpdate();

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(element);
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [ref]);

  return height;
}

function ServerIpPill() {
  const [copied, setCopied] = useState(false);

  async function copyIp() {
    try {
      await navigator.clipboard.writeText("play.hubmc.in");
      setCopied(true);
      toast.success("Server IP copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy IP");
    }
  }

  return (
    <div className="pointer-events-auto absolute left-4 top-6 z-20 sm:left-6 md:left-8 md:top-8">
      <button
        onClick={copyIp}
        className="group flex items-center gap-2.5 cursor-pointer rounded-full px-4 py-2 transition-all duration-300 hover:scale-105"
        style={{
          background: "linear-gradient(135deg, rgba(20,20,20,.75), rgba(0,0,0,.85))",
          border: "1px solid rgba(255,180,50,.4)",
          boxShadow: "0 4px 24px rgba(0,0,0,.5), 0 0 16px rgba(255,160,0,.12)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
        aria-label="Copy server IP to clipboard"
      >
        {/* Hover glow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ boxShadow: "0 0 30px -4px rgba(255,180,50,0.35)" }}
        />
        <span
          className="relative z-10 text-xs sm:text-sm font-black tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,138,42,0.5)]"
          style={{ textShadow: "0 0 12px rgba(255,138,42,0.4)" }}
        >
          PLAY.HUBMC.IN
        </span>
        <span className="relative z-10 flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,.8)]" />
          ONLINE
        </span>
        <span className="relative z-10 text-white/60 transition-colors duration-200 group-hover:text-white">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </span>
      </button>
    </div>
  );
}

function Hero({ navHeight }: { navHeight: number }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 42,
    damping: 24,
    mass: 1,
  });

  const scale = useTransform(smooth, [0, 1], [1.07, 1.0]);
  const y = useTransform(smooth, [0, 1], ["0%", "-6%"]);
  const heroOpacity = useTransform(smooth, [0, 0.82, 1], [1, 1, 0.78]);
  const textY = useTransform(smooth, [0, 1], ["0%", "-24%"]);
  const textOpacity = useTransform(smooth, [0, 0.38], [1, 0]);

  const [imgPos, setImgPos] = useState("center center");
  const [heroVh, setHeroVh] = useState("85vh");

  useEffect(() => {
    function updateLayout() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const r = w / h;
      if (r < 0.6) { setImgPos("center 45%"); setHeroVh("85vh"); }
      else if (r < 0.8) { setImgPos("center 48%"); setHeroVh("82vh"); }
      else { setImgPos("center center"); setHeroVh("78vh"); }
    }
    updateLayout();
    window.addEventListener("resize", updateLayout, { passive: true });
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  const heroHeight = navHeight > 0 ? `${heroVh}` : heroVh;
  const stageHeight = `calc(${heroVh} + 240vh)`;

  return (
    <section
      id="home"
      ref={heroRef}
      className="relative left-1/2 w-[100vw] max-w-full -translate-x-1/2"
      style={{ height: stageHeight }}
    >
      <div
        className="sticky w-full overflow-hidden bg-[#050505]"
        style={{
          top: navHeight,
          height: heroHeight,
          minHeight: "min(650px, 85vh)",
          maxHeight: "850px",
        }}
      >
        <motion.div
          style={{
            scale,
            y,
            opacity: heroOpacity,
            willChange: "transform, opacity",
            backfaceVisibility: "hidden",
          }}
          className="absolute inset-0 overflow-hidden"
        >
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0">
              <img
                src={heroImg}
                alt="HubMC Minecraft world"
                className="h-full w-full select-none object-cover"
                style={{ objectPosition: imgPos, imageRendering: "auto" }}
                draggable={false}
                fetchPriority="high"
                loading="eager"
              />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent to-[#050505]" />
          {/* Subtle gradient overlay behind navbar */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-black/25 to-transparent" />
        </motion.div>

        <motion.div
          style={{
            y: textY,
            opacity: textOpacity,
            willChange: "transform, opacity",
          }}
          className="relative z-10 h-full pointer-events-none"
        >
          {/* ─── SERVER IP ─── */}
          <ServerIpPill />

          {/* ─── FEATURE CARDS ─── */}
          <div
            className="pointer-events-auto absolute left-1/2 -translate-x-1/2 w-full px-4"
            style={{ bottom: "clamp(55px, 12vh, 110px)" }}
          >
            <div className="mx-auto max-w-6xl">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 md:gap-3">
                {[
                  { icon: Sword, label: "SURVIVAL", subtitle: "EPIC ADVENTURES" },
                  { icon: Package, label: "EXCLUSIVE", subtitle: "CRATES" },
                  { icon: Trophy, label: "TOURNAMENTS", subtitle: "COMPETE & WIN" },
                  { icon: Users, label: "ACTIVE COMMUNITY", subtitle: "PLAY. CHAT. GROW." },
                  { icon: Shield, label: "FAIR PLAY", subtitle: "ZERO TOLERANCE" },
                  { icon: Settings, label: "CUSTOM FEATURES", subtitle: "UNIQUE EXPERIENCE" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="group relative flex flex-col items-center justify-center rounded-xl px-1.5 py-3 md:py-4 text-center transition-all duration-300 hover:-translate-y-2 hover:scale-105"
                    style={{
                      background: "linear-gradient(to bottom, rgba(35,35,35,.82), rgba(0,0,0,.9))",
                      border: "1px solid rgba(255,180,50,.5)",
                      boxShadow: "0 10px 35px rgba(0,0,0,.65), 0 0 18px rgba(255,160,0,.15)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                    }}
                  >
                    {/* Bevel shine */}
                    <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/[0.08] to-transparent" />
                    {/* Gold inner glow on hover */}
                    <div
                      className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{
                        boxShadow: "inset 0 0 25px -6px rgba(255,180,50,0.5)",
                      }}
                    />
                    {/* Hover outer glow */}
                    <div
                      className="pointer-events-none absolute -inset-[1px] rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{ boxShadow: "0 0 40px -4px rgba(255,180,50,0.35)" }}
                    />
                    <item.icon className="relative z-10 h-5 w-5 md:h-6 md:w-6 text-[var(--hub-orange)] drop-shadow-[0_0_10px_rgba(255,138,42,0.5)]" />
                    <span className="relative z-10 mt-1.5 text-[10px] md:text-xs font-black tracking-wider text-white">
                      {item.label}
                    </span>
                    <span className="relative z-10 mt-0.5 text-[8px] md:text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,.75)" }}>
                      {item.subtitle}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── COMMUNITY BANNER ─── */}
          <div
            className="pointer-events-auto absolute left-1/2 -translate-x-1/2 w-full px-4"
            style={{ bottom: "clamp(8px, 3vh, 35px)" }}
          >
            <a
              href="https://discord.gg/CwNVBCuSbj"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative mx-auto block max-w-3xl overflow-hidden rounded-xl px-6 py-3 md:py-4 text-center transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "linear-gradient(to bottom, rgba(30,30,30,.88), rgba(0,0,0,.95))",
                border: "1px solid rgba(255,180,50,.45)",
                boxShadow: "0 8px 30px rgba(0,0,0,.6), 0 0 20px rgba(255,160,0,.1)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[var(--hub-orange)]/6 to-transparent" />
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="pointer-events-none absolute inset-0 rounded-xl"
                style={{ boxShadow: "inset 0 0 35px -10px rgba(255,180,50,0.2)" }}
              />
              <div
                className="pointer-events-none absolute -inset-[1px] rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ boxShadow: "0 0 50px -6px rgba(255,180,50,0.3)" }}
              />
              <p className="relative z-10 text-[11px] md:text-sm font-bold uppercase tracking-[0.25em] text-white/95">
                JOIN THE COMMUNITY & BE PART OF THE{" "}
                <span className="text-[var(--hub-orange)] drop-shadow-[0_0_12px_rgba(255,138,42,0.55)]">LEGACY</span>
              </p>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function AboutSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 22,
    mass: 0.5,
  });
  const y = useTransform(smooth, [0, 1], [80, 0]);
  const opacity = useTransform(smooth, [0, 1], [0, 1]);

  // Mouse parallax for logo
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18, mass: 0.8 });
  const sy = useSpring(my, { stiffness: 60, damping: 18, mass: 0.8 });

  const onMouseMove = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    mx.set(px * 24);
    my.set(py * 24);
  };
  const onMouseLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <section
      id="about"
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative min-h-screen overflow-hidden py-24 md:py-32 px-6"
      style={{ background: "#050505" }}
    >
      {/* Glow accents */}
      <div
        className="pointer-events-none absolute -top-40 -left-32 h-[600px] w-[600px] rounded-full opacity-40 blur-[160px]"
        style={{
          background:
            "radial-gradient(circle, rgba(60,140,255,0.55), transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full opacity-35 blur-[160px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,140,40,0.5), transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          background:
            "radial-gradient(1200px 600px at 50% 20%, rgba(60,140,255,0.18), transparent 70%)",
        }}
      />

      {/* Particles */}
      <Particles />

      <motion.div
        style={{ y, opacity, willChange: "transform, opacity" }}
        className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 md:grid-cols-2"
      >
        {/* LEFT */}
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">
            Home <span className="mx-2 text-white/30">›</span>{" "}
            <span className="text-[var(--hub-orange)]">About Us</span>
          </p>
          <h2 className="mt-6 text-4xl sm:text-5xl md:text-7xl font-black leading-[0.95] tracking-tight text-white">
            About <span className="text-[var(--hub-orange)]">Us</span>
          </h2>
          <div className="mt-6 h-px w-24 bg-gradient-to-r from-[var(--hub-blue)] via-[var(--hub-orange)] to-transparent" />
          <p className="mt-8 text-base md:text-lg leading-relaxed text-white/70">
            HUBMC is a premium Minecraft network engineered for players who
            demand more from every block. Explore reimagined biomes, conquer
            never-before-seen mobs, and forge your legacy across worlds shaped
            by an obsessive team of builders, coders, and storytellers.
          </p>
          <p className="mt-4 text-base md:text-lg leading-relaxed text-white/60">
            Lag-free servers. Endless adventures. A universe built block by
            block — for the next generation of players.
          </p>

          <div className="mt-10 flex flex-wrap gap-8">
            {[
              { k: "120+", v: "Active Players" },
              { k: "40+", v: "Custom Biomes" },
              { k: "24/7", v: "Lag-free Servers" },
            ].map((s) => (
              <div key={s.v}>
                <div className="text-3xl font-black text-white">{s.k}</div>
                <div className="mt-1 text-[11px] uppercase tracking-widest text-white/50">
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Logo */}
        <div className="relative flex items-center justify-center">
          <motion.div
            style={{ x: sx, y: sy }}
            className="relative"
          >
            {/* Soft glow */}
            <motion.div
              animate={{ opacity: [0.45, 0.75, 0.45] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 -z-10 rounded-full blur-[80px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(60,140,255,0.55), rgba(255,140,40,0.35) 55%, transparent 70%)",
              }}
            />
            <motion.img
              src={logoImg}
              alt="HUBMC Network"
              animate={{ y: [0, -14, 0], rotate: [-2, 2, -2] }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative h-[240px] w-[240px] sm:h-[320px] sm:w-[320px] md:h-[440px] md:w-[440px] object-contain drop-shadow-[0_30px_60px_rgba(40,90,200,0.55)]"
              draggable={false}
            />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

function ContactSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 22,
    mass: 0.5,
  });
  const y = useTransform(smooth, [0, 1], [80, 0]);
  const opacity = useTransform(smooth, [0, 1], [0, 1]);

  const [form, setForm] = useState({ name: "", email: "", minecraftUsername: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!form.name.trim()) { setError("Enter your name."); return; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("Enter a valid email."); return; }
    if (!form.subject.trim()) { setError("Enter a subject."); return; }
    if (!form.message.trim()) { setError("Enter your message."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error || "Failed to send."); return; }
      setSuccess(true);
      setForm({ name: "", email: "", minecraftUsername: "", subject: "", message: "" });
    } catch { setError("Network error. Try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <section
      id="contact"
      ref={ref}
      className="relative min-h-screen overflow-hidden py-24 md:py-32 px-6"
      style={{ background: "#050505" }}
    >
      <div className="pointer-events-none absolute -top-40 -right-32 h-[600px] w-[600px] rounded-full opacity-40 blur-[160px]"
        style={{ background: "radial-gradient(circle, rgba(255,140,40,0.55), transparent 60%)" }}
      />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full opacity-35 blur-[160px]"
        style={{ background: "radial-gradient(circle, rgba(60,140,255,0.5), transparent 60%)" }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{ background: "radial-gradient(1200px 600px at 50% 80%, rgba(255,140,40,0.18), transparent 70%)" }}
      />

      <Particles />

      <motion.div
        style={{ y, opacity, willChange: "transform, opacity" }}
        className="relative z-10 mx-auto max-w-6xl"
      >
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.42em] text-[var(--hub-blue)]">
            Home <span className="mx-2 text-white/30">›</span>{" "}
            <span className="text-[var(--hub-orange)]">Contact Us</span>
          </p>
          <h2 className="mt-6 text-4xl sm:text-5xl md:text-7xl font-black leading-[0.95] tracking-tight text-white">
            Contact <span className="text-[var(--hub-orange)]">HUBMC</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/60">
            Need help? Reach out to our team.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto mt-16 max-w-lg rounded-[32px] border border-[rgba(62,162,255,0.2)] bg-[rgba(11,11,11,0.92)] p-10 text-center"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-[rgba(62,162,255,0.22)] bg-black/65">
                <CheckCircle className="h-10 w-10 text-[var(--hub-blue)]" />
              </div>
              <h2 className="mt-6 text-3xl font-black text-white">Message Sent!</h2>
              <p className="mt-4 text-base leading-7 text-white/60">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
              <button onClick={() => setSuccess(false)} className="mx-auto mt-8 inline-flex items-center gap-2 rounded-2xl border border-white/10 px-6 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/[0.05] hover:text-white">
                Send Another Message
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mx-auto mt-16 grid gap-8 lg:grid-cols-[1fr_340px]"
            >
              <div className="rounded-[32px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-8 md:p-10">
                <h2 className="text-2xl font-black text-white">Send us a Message</h2>
                <p className="mt-2 text-sm text-white/50">Fill out the form and we'll respond promptly.</p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-white/70">Name *</label>
                      <input type="text" value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Your name" disabled={submitting}
                        className="mt-1.5 h-12 w-full rounded-2xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[rgba(62,162,255,0.4)] focus:ring-1 focus:ring-[rgba(62,162,255,0.25)] disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70">Email *</label>
                      <input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="your@email.com" disabled={submitting}
                        className="mt-1.5 h-12 w-full rounded-2xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[rgba(62,162,255,0.4)] focus:ring-1 focus:ring-[rgba(62,162,255,0.25)] disabled:opacity-50" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70">Minecraft Username</label>
                    <input type="text" value={form.minecraftUsername} onChange={(e) => handleChange("minecraftUsername", e.target.value)} placeholder="e.g. Notch" disabled={submitting}
                      className="mt-1.5 h-12 w-full rounded-2xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[rgba(62,162,255,0.4)] focus:ring-1 focus:ring-[rgba(62,162,255,0.25)] disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70">Subject *</label>
                    <input type="text" value={form.subject} onChange={(e) => handleChange("subject", e.target.value)} placeholder="What is this about?" disabled={submitting}
                      className="mt-1.5 h-12 w-full rounded-2xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[rgba(62,162,255,0.4)] focus:ring-1 focus:ring-[rgba(62,162,255,0.25)] disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70">Message *</label>
                    <textarea value={form.message} onChange={(e) => handleChange("message", e.target.value)} placeholder="Describe your issue..." rows={5} disabled={submitting}
                      className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[rgba(62,162,255,0.4)] focus:ring-1 focus:ring-[rgba(62,162,255,0.25)] disabled:opacity-50 resize-y" />
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 rounded-2xl border border-[rgba(255,138,42,0.25)] bg-[rgba(255,138,42,0.08)] px-4 py-3 text-sm leading-6 text-white/80">
                      <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--hub-orange)]" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <button type="submit" disabled={submitting}
                    className={`flex h-13 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold transition-all duration-300 ${
                      submitting
                        ? "cursor-not-allowed bg-white/8 text-white/40"
                        : "bg-[var(--hub-blue)] text-white hover:-translate-y-0.5 hover:bg-[#51adff] shadow-[0_0_25px_rgba(62,162,255,0.3)]"
                    }`}>
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                        Sending...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2"><Send className="h-4 w-4" /> Send Message</span>
                    )}
                  </button>
                </form>
              </div>

              <div className="space-y-5">
                <div className="rounded-[32px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-7">
                  <h3 className="text-lg font-black text-white">Support Channels</h3>
                  <div className="mt-6 space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(62,162,255,0.2)] bg-[rgba(62,162,255,0.08)]">
                        <MessageCircle className="h-5 w-5 text-[var(--hub-blue)]" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Discord Support</p>
                        <p className="mt-1 text-sm leading-6 text-white/50">Join our Discord for live chat support.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(255,138,42,0.2)] bg-[rgba(255,138,42,0.08)]">
                        <Mail className="h-5 w-5 text-[var(--hub-orange)]" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Email Support</p>
                        <p className="mt-1 text-sm leading-6 text-white/50">support@hubmc.in — we respond within 24h.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(62,162,255,0.2)] bg-[rgba(62,162,255,0.08)]">
                        <Clock className="h-5 w-5 text-[var(--hub-blue)]" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Store Hours</p>
                        <p className="mt-1 text-sm leading-6 text-white/50">Support available 24/7. Response times may vary.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}

function Particles() {
  const particles = Array.from({ length: 28 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((_, i) => {
        const left = (i * 37) % 100;
        const delay = (i * 0.37) % 6;
        const duration = 8 + ((i * 1.3) % 8);
        const size = 1 + (i % 3);
        return (
          <motion.span
            key={i}
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: "-10%", opacity: [0, 0.7, 0] }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              background:
                i % 2 === 0
                  ? "rgba(80,160,255,0.85)"
                  : "rgba(255,170,90,0.7)",
              boxShadow:
                i % 2 === 0
                  ? "0 0 8px rgba(80,160,255,0.95)"
                  : "0 0 8px rgba(255,170,90,0.8)",
            }}
            className="absolute rounded-full"
          />
        );
      })}
    </div>
  );
}

function SeoContentSection() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">
          Welcome to <span className="text-[var(--hub-orange)]">HUBMC</span>
        </h2>
        <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-[var(--hub-blue)] via-[var(--hub-orange)] to-transparent" />
        <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-white/60">
          HUBMC is a premium Minecraft server community built for players who demand more. Whether you are here to compete in high-stakes tournaments, customize your experience with exclusive ranks and packages, watch live streams, or connect with fellow players — HUBMC is your home.
        </p>
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--hub-blue)]/10 text-[var(--hub-blue)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-white">Tournaments &amp; PvP</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              Compete in organized Minecraft tournaments with brackets, prizes, and ranked leaderboards. From casual events to championship series — there is always a match waiting.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--hub-orange)]/10 text-[var(--hub-orange)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-white">Store &amp; Packages</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              Unlock exclusive ranks, cosmetics, and perks through the HUBMC store. Choose from VIP, MVP, and premium packages tailored to your playstyle.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left sm:col-span-2 lg:col-span-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-white">Community &amp; Forum</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              Join the HUBMC community on our forum and Discord. Get support, share feedback, discuss strategies, and connect with thousands of fellow Minecraft players.
            </p>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-xl text-sm text-white/40">
          Play now at <span className="font-mono text-[var(--hub-blue)]">hubmc.in</span> — the official HUBMC Minecraft server. Available on Java Edition and Bedrock Edition.
        </p>
      </div>
    </section>
  );
}

export default function HubMCLanding() {
  const navRef = useRef<HTMLElement>(null);
  const navHeight = useElementHeight(navRef);

  return (
    <main className="hubmc bg-[#050505] text-white">
      <HubMCNavbar ref={navRef} />
      <div aria-hidden="true" style={{ height: navHeight }} />
      <Hero navHeight={navHeight} />
      <AboutSection />
      <SeoContentSection />
      <ContactSection />
    </main>
  );
}
