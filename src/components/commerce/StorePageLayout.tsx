import { useEffect, useRef, useState, type RefObject } from "react";
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

export function StorePageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navRef = useRef<HTMLElement>(null);
  const navHeight = useElementHeight(navRef);

  return (
    <main className="hubmc min-h-screen overflow-x-hidden bg-black text-white">
      <HubMCNavbar ref={navRef} />
      <div aria-hidden="true" style={{ height: navHeight }} />
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
