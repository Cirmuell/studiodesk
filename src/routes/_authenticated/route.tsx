import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      // On native, skip onboarding — the user has already been through it
      const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();
      if (!isNative && typeof window !== "undefined" && !window.localStorage.getItem("has_seen_onboarding")) {
        throw redirect({ to: "/onboarding" });
      }
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => (
    <>
      <Outlet />
    </>
  ),
});
