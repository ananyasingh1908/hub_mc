export type ProductAccent = "blue" | "orange";

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  image: string;
  accent: ProductAccent;
  badge: string;
  imagePosition?: string;
  rewards: string[];
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type CartLine = {
  product: Product;
  quantity: number;
  subtotal: number;
};

export type Coupon = {
  code: string;
  percentageOff: number;
  description: string;
};

export type UserAgreements = {
  termsAccepted: boolean;
  ageConfirmed: boolean;
  usernameConfirmed: boolean;
};

export type PaymentMethod = "card" | "upi" | "netbanking" | "wallet";

export type DeliveryStatusType = "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED" | "AWAITING_SERVER";

export type CheckoutFormValues = {
  minecraftUsername: string;
  minecraftUuid: string;
  email: string;
  country: string;
  paymentMethod: PaymentMethod;
};

export type OrderSummary = {
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  total: number;
};

export type OrderRecord = {
  id: string;
  createdAt: string;
  minecraftUsername: string;
  minecraftUuid: string;
  email: string;
  country: string;
  paymentMethod: PaymentMethod;
  items: CartLine[];
  coupon: Coupon | null;
  summary: OrderSummary;
  paymentStatus: string;
  deliveryStatus: DeliveryStatusType;
};

export type DeliveryJob = {
  orderId: string;
  minecraftUsername: string;
  minecraftUuid: string;
  items: CartLine[];
  status: DeliveryStatusType;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
};

export type SupportTicketPayload = {
  minecraftUsername: string;
  email: string;
  subject: string;
  message: string;
};
