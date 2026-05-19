import { ShieldCheck } from "lucide-react";
import { useCartStore } from "@/store/cart-store";

const agreementOptions = [
  {
    key: "termsAccepted" as const,
    label: "I agree with Terms & Conditions",
  },
  {
    key: "ageConfirmed" as const,
    label: "I confirm age requirements / guardian permission",
  },
  {
    key: "usernameConfirmed" as const,
    label: "I verify this Minecraft username belongs to me",
  },
];

export function UserAgreementPanel() {
  const agreements = useCartStore((state) => state.agreements);
  const setAgreement = useCartStore((state) => state.setAgreement);
  const isComplete = Object.values(agreements).every(Boolean);

  return (
    <section className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[rgba(255,138,42,0.12)] p-3 text-[var(--hub-orange)]">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            User Agreement
          </h2>
          <p className="mt-1 text-sm text-white/56">
            Confirm each requirement before checkout.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {agreementOptions.map((option) => (
          <label
            key={option.key}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-white/78 transition-colors hover:border-[rgba(62,162,255,0.22)]"
          >
            <input
              type="checkbox"
              checked={agreements[option.key]}
              onChange={(event) =>
                setAgreement(option.key, event.currentTarget.checked)
              }
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black text-[var(--hub-orange)] accent-[var(--hub-orange)]"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      {!isComplete ? (
        <div className="mt-4 rounded-2xl border border-[rgba(255,138,42,0.24)] bg-[rgba(255,138,42,0.08)] p-4 text-sm text-white/78">
          Checkout stays disabled until all confirmations are completed.
        </div>
      ) : null}
    </section>
  );
}
