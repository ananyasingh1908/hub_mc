export function AuthPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="hubmc min-h-screen bg-black text-white">
      <div className="relative isolate overflow-hidden" style={{ position: "relative" }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(circle at top left, rgba(62,162,255,0.18), transparent 34%), radial-gradient(circle at top right, rgba(255,138,42,0.18), transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 28%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.08]" />
        <div className="relative z-10">{children}</div>
      </div>
    </main>
  );
}
