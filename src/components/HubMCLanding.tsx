import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "framer-motion";
import heroImg from "@/assets/hubmc-hero.jpeg";
import logoImg from "@/assets/hubmc-logo.png";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Packages", href: "#packages" },
  { label: "Livestream", href: "#livestream" },
  { label: "About", href: "#about" },
  { label: "Contact Us", href: "#contact" },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        scrolled
          ? "backdrop-blur-xl bg-black/70 border-b border-white/10 shadow-[0_8px_40px_-12px_rgba(60,140,255,0.25)]"
          : "backdrop-blur-md bg-black/40 border-b border-white/5"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:py-5">
        <a href="#home" className="flex items-center gap-3 group">
          <img
            src={logoImg}
            alt="HubMC"
            className="h-9 w-9 rounded-md object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_12px_rgba(60,140,255,0.5)]"
          />
          <span className="text-lg font-black tracking-widest">
            <span className="text-[var(--hub-blue)]">HUB</span>
            <span className="text-[var(--hub-orange)]">MC</span>
          </span>
        </a>

        <ul className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="group relative px-4 py-2 text-sm font-medium uppercase tracking-wider text-white/80 transition-colors duration-300 hover:text-white"
              >
                <span className="relative z-10">{l.label}</span>
                <span className="pointer-events-none absolute left-4 right-4 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-transparent via-[var(--hub-orange)] to-transparent transition-transform duration-500 group-hover:scale-x-100" />
                <span className="pointer-events-none absolute inset-0 rounded-md opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100 bg-[var(--hub-blue)]/20" />
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </motion.header>
  );
}

function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 50,
    damping: 28,
    mass: 0.9,
  });

  // Very subtle scale 1.03 -> 1.00
  const scale = useTransform(smooth, [0, 1], [1.03, 1.0]);
  const y = useTransform(smooth, [0, 1], ["0%", "-4%"]);
  const heroOpacity = useTransform(smooth, [0, 0.9, 1], [1, 1, 0.6]);
  const textY = useTransform(smooth, [0, 1], ["0%", "-30%"]);
  const textOpacity = useTransform(smooth, [0, 0.4], [1, 0]);

  return (
    <section
      id="home"
      ref={heroRef}
      className="relative w-full"
      style={{ height: "300vh" }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#050505]">
        <motion.div
          style={{
            scale,
            y,
            opacity: heroOpacity,
            willChange: "transform, opacity",
            backfaceVisibility: "hidden",
          }}
          className="absolute inset-0 flex items-center justify-center pt-[72px]"
        >
          <img
            src={heroImg}
            alt="HubMC Minecraft world"
            className="max-h-full max-w-full select-none object-contain"
            draggable={false}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-[#050505]" />
        </motion.div>

        <motion.div
          style={{
            y: textY,
            opacity: textOpacity,
            willChange: "transform, opacity",
          }}
          className="relative z-10 flex h-full flex-col items-center justify-end pb-16 px-6 text-center pointer-events-none"
        >
        <p className="text-[10px] md:text-xs font-medium uppercase tracking-[0.6em] text-white/85">
          Scroll to enter
        </p>
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{
            duration: 1.6,
            ease: [0.22, 1, 0.36, 1],
            repeat: Infinity,
            repeatType: "reverse",
            repeatDelay: 0.2,
          }}
          style={{ originY: 0 }}
          className="mt-4 h-12 w-px bg-gradient-to-b from-white/90 to-transparent"
        />
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
          <h2 className="mt-6 text-5xl md:text-7xl font-black leading-[0.95] tracking-tight text-white">
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
              { k: "120K+", v: "Active Players" },
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
              className="relative h-[320px] w-[320px] md:h-[440px] md:w-[440px] object-contain drop-shadow-[0_30px_60px_rgba(40,90,200,0.55)]"
              draggable={false}
            />
          </motion.div>
        </div>
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

export default function HubMCLanding() {
  return (
    <main className="hubmc bg-[#050505] text-white">
      <Navbar />
      <Hero />
      <AboutSection />
    </main>
  );
}
