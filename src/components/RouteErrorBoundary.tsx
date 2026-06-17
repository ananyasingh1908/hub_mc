import { AlertCircle, RefreshCw } from "lucide-react";
import { StorePageLayout } from "@/components/commerce/StorePageLayout";

export function RouteErrorBoundary({ error, reset }: { error: Error; reset?: () => void }) {
  return (
    <StorePageLayout>
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-2xl font-bold text-white">Something went wrong</h2>
        <p className="mt-2 text-white/50">{error.message || "An unexpected error occurred while loading this page."}</p>
        {reset && (
          <button
            onClick={reset}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        )}
      </div>
    </StorePageLayout>
  );
}
