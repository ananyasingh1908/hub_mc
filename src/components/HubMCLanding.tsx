import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import heroImg from "@/assets/hubmc-hero.jpeg";

export default function HubMCLanding() {
  const heroRef = useRef<HTMLDivElement>(null);

  // Track scroll over the hero section
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // Buttery smoothing
  const smooth = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 24,
    mass: 0.6,
  });

  // Cinematic zoom-out: 1.25 -> 1.0
  const scale = useTransform(smooth, [0, 1], [1.25, 1.0]);
  // Subtle parallax drift up
  const y = useTransform(smooth, [0, 1], ["0%", "-12%"]);
  // Gentle vignette/fade as we scroll
  const heroOpacity = useTransform(smooth, [0, 0.85, 1], [1, 1, 0.6]);
  // Foreground text drifts and fades a bit
  const textY = useTransform(smooth, [0, 1], ["0%", "-30%"]);
  const textOpacity = useTransform(smooth, [0, 0.6], [1, 0]);

  return (
    <main className="hubmc bg-[var(--hub-bg-deep)] text-[var(--hub-text)]">
      {/* HERO */}
      <section
        ref={heroRef}
        className="relative h-screen w-full overflow-hidden"
      >
        <motion.div
          style={{
            scale,
            y,
            opacity: heroOpacity,
            willChange: "transform, opacity",
            backfaceVisibility: "hidden",
          }}
          className="absolute inset-0"
        >
          <img
            src={heroImg}
            alt="HubMC Minecraft world hero"
            className="h-full w-full object-cover select-none"
            draggable={false}
          />
          {/* Bottom fade into next section */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-[var(--hub-bg-deep)]" />
          {/* Slight darkening for legibility */}
          <div className="pointer-events-none absolute inset-0 bg-black/10" />
        </motion.div>

        {/* Foreground text overlay */}
        <motion.div
          style={{ y: textY, opacity: textOpacity, willChange: "transform, opacity" }}
          className="relative z-10 flex h-full flex-col items-center justify-end pb-16 text-center px-6"
        >
          <p className="text-xs md:text-sm tracking-[0.4em] text-white/80 uppercase">
            Scroll to enter
          </p>
          <div className="mt-3 h-10 w-px bg-gradient-to-b from-white/80 to-transparent" />
        </motion.div>
      </section>

      {/* ABOUT */}
      <AboutSection />
    </main>
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

  return (
    <section
      ref={ref}
      className="relative min-h-screen overflow-hidden bg-[var(--hub-bg-deep)] py-32 px-6"
    >
      {/* Purple glow accents */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full opacity-40 blur-[140px]"
        style={{ background: "radial-gradient(circle, var(--hub-purple-glow), transparent 60%)" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full opacity-25 blur-[160px]"
        style={{ background: "radial-gradient(circle, var(--hub-purple), transparent 60%)" }}
      />

      <motion.div
        style={{ y, opacity, willChange: "transform, opacity" }}
        className="relative z-10 mx-auto max-w-4xl text-center"
      >
        <p className="text-xs md:text-sm tracking-[0.5em] uppercase text-[var(--hub-purple-glow)]">
          About HubMC
        </p>
        <h2 className="mt-6 text-4xl md:text-7xl font-black tracking-tight">
          A universe built <span className="text-[var(--hub-green)]">block by block</span>.
        </h2>
        <p className="mt-8 text-lg md:text-xl leading-relaxed text-[var(--hub-muted)]">
          HubMC is a premium Minecraft server crafted for players who want more.
          Explore reimagined biomes, battle never-before-seen mobs, and forge your
          legend across worlds designed by an obsessive team of builders, coders,
          and storytellers.
        </p>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { k: "120K+", v: "Active Players" },
            { k: "40+", v: "Custom Biomes" },
            { k: "24/7", v: "Lag-free Servers" },
          ].map((s) => (
            <div
              key={s.v}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-sm"
            >
              <div className="text-4xl font-black text-[var(--hub-text)]">{s.k}</div>
              <div className="mt-2 text-sm uppercase tracking-widest text-[var(--hub-muted)]">
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}