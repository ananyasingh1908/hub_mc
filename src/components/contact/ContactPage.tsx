import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Send, MessageCircle, Mail, Clock, CheckCircle, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";
import { JsonLd } from "@/components/JsonLd";
import { faqSchema, breadcrumbSchema } from "@/lib/json-ld";

type FaqItem = {
  q: string;
  a: string;
};

const FAQS: FaqItem[] = [
  { q: "Payment issues", a: "If your payment was charged but the package was not delivered, contact us with your order ID and payment receipt. We typically resolve payment issues within 24 hours." },
  { q: "Missing package", a: "Packages are delivered instantly in most cases. If your package is missing, check your in-game inventory and /redeem commands. Still missing? Open a ticket with your transaction ID." },
  { q: "Refund questions", a: "Refunds are handled on a case-by-case basis within 7 days of purchase. Please provide your order ID and reason for the refund request." },
  { q: "Account help", a: "If you're having trouble logging in or linking your Minecraft account, make sure you're using the correct email associated with your purchase. Contact support for account recovery." },
];

const SUCCESS_VARIANTS: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", minecraftUsername: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to send message.");
        return;
      }
      setSuccess(true);
      setForm({ name: "", email: "", minecraftUsername: "", subject: "", message: "" });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const contactBreadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Contact", url: "/contact" },
  ];

  return (
    <StorePageLayout>
      <JsonLd data={faqSchema(FAQS.map((f) => ({ question: f.q, answer: f.a })))} />
      <JsonLd data={breadcrumbSchema(contactBreadcrumbItems)} />
      <section className="relative min-h-screen overflow-hidden px-6 pt-32 pb-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-0 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(62,162,255,0.15),transparent_68%)] blur-3xl" />
          <div className="absolute right-0 bottom-0 h-[35rem] w-[35rem] rounded-full bg-[radial-gradient(circle,rgba(255,138,42,0.12),transparent_70%)] blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.42em] text-[var(--hub-blue)]">Get in Touch</p>
            <h1 className="mt-5 text-5xl font-black tracking-tight text-white md:text-7xl">
              Contact <span className="text-[var(--hub-orange)]">HUBMC</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/60">
              Need help? Reach out to our team.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                variants={SUCCESS_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="mx-auto mt-16 max-w-lg rounded-[32px] border border-[rgba(62,162,255,0.2)] bg-[linear-gradient(180deg,rgba(16,16,16,0.96),rgba(8,8,8,0.96))] p-10 text-center shadow-[0_30px_80px_-30px_rgba(62,162,255,0.4)]"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-[rgba(62,162,255,0.22)] bg-black/65 shadow-[0_0_50px_rgba(62,162,255,0.25)]">
                  <CheckCircle className="h-10 w-10 text-[var(--hub-blue)]" />
                </div>
                <h2 className="mt-6 text-3xl font-black text-white">Message Sent!</h2>
                <p className="mt-4 text-base leading-7 text-white/60">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
                <button
                  onClick={() => setSuccess(false)}
                  className="mx-auto mt-8 inline-flex items-center gap-2 rounded-2xl border border-white/10 px-6 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/[0.05] hover:text-white"
                >
                  Send Another Message
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mx-auto mt-16 grid gap-8 lg:grid-cols-[1fr_380px]"
              >
                <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,16,16,0.96),rgba(8,8,8,0.96))] p-8 shadow-[0_20px_60px_-20px_rgba(62,162,255,0.2)] md:p-10">
                  <h2 className="text-2xl font-black text-white">Send us a Message</h2>
                  <p className="mt-2 text-sm text-white/50">Fill out the form and we'll respond promptly.</p>

                  <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-white/70">Name *</label>
                        <input
                          type="text" value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Your name"
                          disabled={submitting}
                          className="mt-1.5 h-12 w-full rounded-2xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[rgba(62,162,255,0.4)] focus:ring-1 focus:ring-[rgba(62,162,255,0.25)] disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/70">Email *</label>
                        <input
                          type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="your@email.com"
                          disabled={submitting}
                          className="mt-1.5 h-12 w-full rounded-2xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[rgba(62,162,255,0.4)] focus:ring-1 focus:ring-[rgba(62,162,255,0.25)] disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70">Minecraft Username</label>
                      <input
                        type="text" value={form.minecraftUsername} onChange={(e) => handleChange("minecraftUsername", e.target.value)} placeholder="e.g. Notch"
                        disabled={submitting}
                        className="mt-1.5 h-12 w-full rounded-2xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[rgba(62,162,255,0.4)] focus:ring-1 focus:ring-[rgba(62,162,255,0.25)] disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70">Subject *</label>
                      <input
                        type="text" value={form.subject} onChange={(e) => handleChange("subject", e.target.value)} placeholder="What is this about?"
                        disabled={submitting}
                        className="mt-1.5 h-12 w-full rounded-2xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[rgba(62,162,255,0.4)] focus:ring-1 focus:ring-[rgba(62,162,255,0.25)] disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70">Message *</label>
                      <textarea
                        value={form.message} onChange={(e) => handleChange("message", e.target.value)} placeholder="Describe your issue or question in detail..."
                        rows={5} disabled={submitting}
                        className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[rgba(62,162,255,0.4)] focus:ring-1 focus:ring-[rgba(62,162,255,0.25)] disabled:opacity-50 resize-y"
                      />
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 rounded-2xl border border-[rgba(255,138,42,0.25)] bg-[rgba(255,138,42,0.08)] px-4 py-3 text-sm leading-6 text-white/80"
                      >
                        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--hub-orange)]" />
                        <span>{error}</span>
                      </motion.div>
                    )}

                    <button
                      type="submit" disabled={submitting}
                      className={`flex h-13 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold transition-all duration-300 ${
                        submitting
                          ? "cursor-not-allowed bg-white/8 text-white/40"
                          : "bg-[var(--hub-blue)] text-white hover:-translate-y-0.5 hover:bg-[#51adff] shadow-[0_0_25px_rgba(62,162,255,0.3)]"
                      }`}
                    >
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
                  <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,16,16,0.96),rgba(8,8,8,0.96))] p-7 shadow-[0_20px_60px_-20px_rgba(255,138,42,0.15)]">
                    <h3 className="text-lg font-black text-white">Support Channels</h3>
                    <div className="mt-6 space-y-5">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(62,162,255,0.2)] bg-[rgba(62,162,255,0.08)]">
                          <MessageCircle className="h-5 w-5 text-[var(--hub-blue)]" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Discord Support</p>
                          <p className="mt-1 text-sm leading-6 text-white/50">Join our Discord server for live chat support from the community and staff team.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(255,138,42,0.2)] bg-[rgba(255,138,42,0.08)]">
                          <Mail className="h-5 w-5 text-[var(--hub-orange)]" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Email Support</p>
                          <p className="mt-1 text-sm leading-6 text-white/50">Send us an email at support@hubmc.in and we'll respond within 24 hours.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(62,162,255,0.2)] bg-[rgba(62,162,255,0.08)]">
                          <Clock className="h-5 w-5 text-[var(--hub-blue)]" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Store Hours</p>
                          <p className="mt-1 text-sm leading-6 text-white/50">Our support team is available 24/7. Response times may vary during peak hours.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-24 max-w-3xl"
          >
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.42em] text-[var(--hub-orange)]">FAQ</p>
              <h2 className="mt-4 text-3xl font-black text-white md:text-4xl">Frequently Asked Questions</h2>
              <p className="mt-3 text-base text-white/50">Quick answers to common questions.</p>
            </div>
            <div className="mt-10 space-y-3">
              {FAQS.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.9)] overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-white/[0.02]"
                  >
                    <span className="font-semibold text-white">{faq.q}</span>
                    {openFaq === i ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-[var(--hub-blue)]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />
                    )}
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="border-t border-white/5 px-6 py-5 text-sm leading-7 text-white/60">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </StorePageLayout>
  );
}
