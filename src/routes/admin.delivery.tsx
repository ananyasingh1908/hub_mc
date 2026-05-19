import { createFileRoute } from "@tanstack/react-router";
import AdminDelivery from "@/components/admin/AdminDelivery";
import { requireAdminAuth } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/admin/delivery")({
  beforeLoad: () => requireAdminAuth("/admin-login"),
  component: AdminDeliveryRoute,
  head: () => ({
    meta: [
      { title: "Delivery Management - HUBMC Admin" },
      { name: "description", content: "Manage order deliveries and RCON commands." },
    ],
  }),
});

function AdminDeliveryRoute() {
  return <AdminDelivery />;
}
