import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem, CheckoutFormValues, Coupon, Product, UserAgreements } from "@/lib/commerce/types";

type CouponResult =
  | { ok: true; coupon: Coupon; message: string }
  | { ok: false; message: string };

type CartState = {
  items: CartItem[];
  appliedCoupon: Coupon | null;
  agreements: UserAgreements;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<CouponResult>;
  clearCoupon: () => void;
  setAgreement: (key: keyof UserAgreements, value: boolean) => void;
  resetAgreements: () => void;
  completeCheckout: (values: CheckoutFormValues) => void;
};

const defaultAgreements: UserAgreements = {
  termsAccepted: false,
  ageConfirmed: false,
  usernameConfirmed: false,
};

const cartStorage =
  typeof window === "undefined"
    ? undefined
    : createJSONStorage<CartState>(() => window.localStorage);

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      appliedCoupon: null,
      agreements: defaultAgreements,
      addItem: (product) =>
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.productId === product.id,
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.productId === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item,
              ),
            };
          }

          return {
            items: [...state.items, { productId: product.id, quantity: 1 }],
          };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        })),
      increaseQuantity: (productId) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        })),
      decreaseQuantity: (productId) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              item.productId === productId
                ? { ...item, quantity: item.quantity - 1 }
                : item,
            )
            .filter((item) => item.quantity > 0),
        })),
      clearCart: () =>
        set({
          items: [],
          appliedCoupon: null,
          agreements: defaultAgreements,
        }),
      applyCoupon: async (code) => {
        const trimmedCode = code.trim().toUpperCase();
        if (!trimmedCode) {
          return { ok: false, message: "Enter a coupon code first." };
        }

        const { appliedCoupon } = get();
        if (appliedCoupon?.code === trimmedCode) {
          return { ok: false, message: "That coupon is already active." };
        }

        if (appliedCoupon) {
          return {
            ok: false,
            message: "Remove the current coupon before redeeming another one.",
          };
        }

        try {
          const res = await fetch("/api/coupon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: trimmedCode }),
          });
          const data = await res.json();
          if (!res.ok || !data.coupon) {
            return { ok: false, message: data.error || "That coupon code is invalid." };
          }

          const coupon: Coupon = {
            code: data.coupon.code,
            percentageOff: data.coupon.percentageOff ?? 0,
            description: data.coupon.description ?? "",
          };

          set({ appliedCoupon: coupon });

          return {
            ok: true,
            coupon,
            message: `${coupon.code} applied for ${coupon.percentageOff}% off.`,
          };
        } catch {
          return { ok: false, message: "Failed to validate coupon. Try again." };
        }
      },
      clearCoupon: () => set({ appliedCoupon: null }),
      setAgreement: (key, value) =>
        set((state) => ({
          agreements: {
            ...state.agreements,
            [key]: value,
          },
        })),
      resetAgreements: () => set({ agreements: defaultAgreements }),
      completeCheckout: () =>
        set({
          items: [],
          appliedCoupon: null,
          agreements: defaultAgreements,
        }),
    }),
    {
      name: "hubmc-cart-store",
      storage: cartStorage,
    },
  ),
);

export function useCartCount(): number {
  return useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
}
