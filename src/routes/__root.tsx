import { QueryClient, onlineManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { toast } from "sonner";
import { persister } from "../router";

function useNetworkStatus() {
  useEffect(() => {
    const handleOnline = () => {
      toast.success("Back online", { id: "network-status", duration: 3000 });
      onlineManager.setOnline(true);
    };
    const handleOffline = () => {
      toast.error("You are offline", { id: "network-status", duration: Infinity });
      onlineManager.setOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
}

function useSmartHomeNav() {
  const router = useRouter();
  return useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const dest = data.user ? "/dashboard" : "/auth";
    router.navigate({ to: dest });
  }, [router]);
}

function NotFoundComponent() {
  const goHome = useSmartHomeNav();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <button
            onClick={goHome}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const goHome = useSmartHomeNav();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try again or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <button
            onClick={goHome}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#d97757" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Studio" },
      { title: "StudioDesk — AI Creative Business Assistant" },
      {
        name: "description",
        content: "AI-grounded pricing and business documents for independent creatives.",
      },
      { property: "og:title", content: "StudioDesk — AI Creative Business Assistant" },
      {
        property: "og:description",
        content: "AI-grounded pricing and business documents for independent creatives.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "StudioDesk — AI Creative Business Assistant" },
      {
        name: "twitter:description",
        content: "AI-grounded pricing and business documents for independent creatives.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5207e65b-5a6e-4eeb-a375-893ae14fb410/id-preview-cedae4b8--341da375-7dbe-4bf2-bb9d-479d3bd71b75.lovable.app-1780893923073.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5207e65b-5a6e-4eeb-a375-893ae14fb410/id-preview-cedae4b8--341da375-7dbe-4bf2-bb9d-479d3bd71b75.lovable.app-1780893923073.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon-512.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useNetworkStatus();

  useEffect(() => {
    void import("../pwa/register").then(({ registerPwa }) => registerPwa());
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Do not cache sensitive user data locally
            const sensitiveKeys = ["profile", "user", "account", "subscription"];
            const isSensitive = query.queryKey.some(
              (key) => typeof key === "string" && sensitiveKeys.includes(key)
            );
            return !isSensitive;
          },
          shouldDehydrateMutation: (mutation) => {
            // Only persist explicitly safe mutations (must be paused/offline to need persistence)
            const safeMutationKeys = ["notifications", "documents"];
            const isSafe = mutation.options.mutationKey?.some(
              (key) => typeof key === "string" && safeMutationKeys.includes(key)
            );
            return mutation.state.isPaused && Boolean(isSafe);
          },
        },
      }}
    >
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <AnimatedSplash>
        <Outlet />
      </AnimatedSplash>
    </PersistQueryClientProvider>
  );
}
