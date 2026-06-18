import { forwardRef, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Headset,
  LoaderCircle,
  LogOut,
  Menu,
  ShoppingCart,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import logoImg from "@/assets/hubmc-logo.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { beginSignOut, useAllSessions, useInvalidateAllSessions } from "@/lib/auth/client";
import { useCartCount } from "@/store/cart-store";
import { NotificationBell } from "@/components/commerce/NotificationBell";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Packages", href: "/packages" },
  { label: "Tournaments", href: "/tournaments" },
  { label: "Livestream", href: "/livestream" },
  { label: "About", href: "/#about" },
  { label: "Contact Us", href: "/contact" },
];

export const HubMCNavbar = forwardRef<HTMLElement>(function HubMCNavbar(
  _props,
  ref,
) {
  const [scrolled, setScrolled] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cartCount = useCartCount();
  const { data: allSessions, isPending: isSessionLoading } = useAllSessions();
  const invalidateAll = useInvalidateAllSessions();
  const navigate = useNavigate();
  const hubUser = allSessions?.customer?.user;
  const employeeSession = allSessions?.employee;
  const adminSession = allSessions?.admin;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await beginSignOut();
      await invalidateAll();
      navigate({ to: "/" });
    } catch (error) {
      console.error(error);
      setIsSigningOut(false);
    }
  };

  return (
    <motion.header
      ref={ref}
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        scrolled
          ? "backdrop-blur-xl bg-black/72 border-b border-white/10 shadow-[0_8px_40px_-12px_rgba(62,162,255,0.25)]"
          : "backdrop-blur-md bg-black/42 border-b border-white/6"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 md:py-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:bg-white/[0.1] md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="group flex items-center gap-3">
            <img
              src={logoImg}
              alt="HubMC"
              className="h-9 w-9 rounded-md object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_12px_rgba(62,162,255,0.5)]"
            />
            <span className="text-lg font-black tracking-widest">
              <span className="text-[var(--hub-blue)]">HUB</span>
              <span className="text-[var(--hub-orange)]">MC</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <ul className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="group relative px-4 py-2 text-sm font-medium uppercase tracking-wider text-white/80 transition-colors duration-300 hover:text-white"
                >
                  <span className="relative z-10">{link.label}</span>
                  <span className="pointer-events-none absolute left-4 right-4 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-transparent via-[var(--hub-orange)] to-transparent transition-transform duration-500 group-hover:scale-x-100" />
                  <span className="pointer-events-none absolute inset-0 rounded-md bg-[var(--hub-blue)]/20 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100" />
                </a>
              </li>
            ))}
          </ul>

          {isSessionLoading ? (
            <div className="inline-flex h-11 items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-4 text-sm text-white/48">
              <LoaderCircle className="h-4 w-4 animate-spin text-[var(--hub-blue)]" />
              <span className="hidden sm:inline">Loading</span>
            </div>
          ) : hubUser?.minecraftUsername ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group inline-flex items-center gap-3 rounded-full border border-[rgba(62,162,255,0.22)] bg-[rgba(62,162,255,0.08)] px-3 py-2 text-left text-sm text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,138,42,0.3)] hover:bg-[rgba(255,138,42,0.12)]">
                  <Avatar className="h-9 w-9 border border-white/10">
                    <AvatarImage
                      src={hubUser.minecraftAvatarUrl ?? undefined}
                      alt={hubUser.minecraftUsername}
                    />
                    <AvatarFallback className="bg-black text-sm font-black text-white">
                      {hubUser.minecraftUsername.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block">
                    <div className="font-semibold text-white">
                      {hubUser.minecraftUsername}
                    </div>
                    <div className="text-xs text-white/46">Minecraft Player</div>
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-64 rounded-3xl border border-white/10 bg-[rgba(10,10,10,0.96)] p-2 text-white backdrop-blur-xl"
              >
                <div className="px-3 py-2">
                  <div className="text-sm font-semibold text-white">
                    {hubUser.minecraftUsername}
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-white/8" />
                <DropdownMenuItem asChild>
                  <Link
                    to="/profile"
                    className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/82 outline-none transition-colors hover:bg-[rgba(62,162,255,0.12)] hover:text-white"
                  >
                    <UserRound className="h-4 w-4 text-[var(--hub-blue)]" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/purchases"
                    className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/82 outline-none transition-colors hover:bg-[rgba(62,162,255,0.12)] hover:text-white"
                  >
                    <WalletCards className="h-4 w-4 text-[var(--hub-blue)]" />
                    <span>Purchases</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/contact"
                    className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/82 outline-none transition-colors hover:bg-[rgba(62,162,255,0.12)] hover:text-white"
                  >
                    <Headset className="h-4 w-4 text-[var(--hub-blue)]" />
                    <span>Support</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/8" />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    void handleSignOut();
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/82 outline-none transition-colors hover:bg-[rgba(255,138,42,0.14)] hover:text-white"
                >
                  <LogOut className="h-4 w-4 text-[var(--hub-orange)]" />
                  <span>{isSigningOut ? "Signing out..." : "Logout"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/login"
              className="group relative inline-flex items-center gap-3 rounded-full border border-[rgba(62,162,255,0.22)] bg-[rgba(62,162,255,0.08)] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,138,42,0.3)] hover:bg-[rgba(255,138,42,0.12)]"
            >
              <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(62,162,255,0.35),transparent_70%)] opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
              <UserRound className="relative z-10 h-4 w-4 text-[var(--hub-blue)] group-hover:text-[var(--hub-orange)]" />
              <span className="relative z-10">Login</span>
            </Link>
          )}

          {hubUser?.minecraftUsername && <NotificationBell />}

          <Link
            to="/cart"
            className="group relative inline-flex items-center gap-3 rounded-full border border-[rgba(62,162,255,0.22)] bg-[rgba(62,162,255,0.08)] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,138,42,0.3)] hover:bg-[rgba(255,138,42,0.12)]"
          >
            <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(62,162,255,0.35),transparent_70%)] opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
            <ShoppingCart className="relative z-10 h-4 w-4 text-[var(--hub-blue)] group-hover:text-[var(--hub-orange)]" />
            <span className="relative z-10 hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="relative z-10 inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--hub-orange)] px-1.5 py-0.5 text-xs font-black text-black"
                >
                  {cartCount}
                </motion.span>
              </AnimatePresence>
            )}
          </Link>
        </div>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-white/10 bg-[rgba(10,10,10,0.98)] backdrop-blur-2xl md:hidden"
            >
              <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
                <span className="text-sm font-black tracking-widest">
                  <span className="text-[var(--hub-blue)]">HUB</span>
                  <span className="text-[var(--hub-orange)]">MC</span>
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-4">
                {hubUser?.minecraftUsername && (
                  <div className="mb-4 rounded-2xl bg-white/[0.03] p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-white/10">
                        <AvatarImage src={hubUser.minecraftAvatarUrl ?? undefined} alt={hubUser.minecraftUsername} />
                        <AvatarFallback className="bg-black text-sm font-black text-white">
                          {hubUser.minecraftUsername.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-semibold text-white">{hubUser.minecraftUsername}</div>
                        <div className="text-xs text-white/46">Minecraft Player</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40 px-3">Navigation</div>
                <div className="space-y-0.5">
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.label}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/72 transition-colors hover:bg-[rgba(62,162,255,0.1)] hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {hubUser?.minecraftUsername && (
                  <>
                    <div className="mt-6 mb-3 text-xs font-semibold uppercase tracking-wider text-white/40 px-3">Account</div>
                    <div className="space-y-0.5">
                      <Link
                        to="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/72 transition-colors hover:bg-[rgba(62,162,255,0.1)] hover:text-white"
                      >
                        <UserRound className="h-4 w-4 text-[var(--hub-blue)]" />
                        Profile
                      </Link>
                      <Link
                        to="/purchases"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/72 transition-colors hover:bg-[rgba(62,162,255,0.1)] hover:text-white"
                      >
                        <WalletCards className="h-4 w-4 text-[var(--hub-blue)]" />
                        My Purchases
                      </Link>
                      <Link
                        to="/contact"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/72 transition-colors hover:bg-[rgba(62,162,255,0.1)] hover:text-white"
                      >
                        <Headset className="h-4 w-4 text-[var(--hub-blue)]" />
                        Support
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/72 transition-colors hover:bg-[rgba(62,162,255,0.1)] hover:text-white"
                      >
                        <UserRound className="h-4 w-4 text-[var(--hub-blue)]" />
                        Profile
                      </Link>
                      <Link
                        to="/purchases"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/72 transition-colors hover:bg-[rgba(62,162,255,0.1)] hover:text-white"
                      >
                        <WalletCards className="h-4 w-4 text-[var(--hub-blue)]" />
                        Purchases
                      </Link>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-white/10 px-3 py-4">
                {hubUser?.minecraftUsername ? (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void handleSignOut();
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/72 transition-colors hover:bg-[rgba(255,138,42,0.14)] hover:text-white"
                  >
                    <LogOut className="h-4 w-4 text-[var(--hub-orange)]" />
                    {isSigningOut ? "Signing out..." : "Logout"}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-[var(--hub-orange)] px-3 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#ff9a46]"
                  >
                    <UserRound className="h-4 w-4" />
                    Login
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
});
