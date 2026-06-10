import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "../supabase/client";

// In production / self-hosted environments (like Vercel), route OAuth through Lovable's configured sandbox broker
const isLovableSandbox = typeof window !== "undefined" && window.location.hostname.includes("lovable.app");
const lovableSandboxUrl = "https://341da375-7dbe-4bf2-bb9d-479d3bd71b75.lovable.app";

const oauthBrokerUrl = !isLovableSandbox
  ? `${lovableSandboxUrl}/~oauth/initiate`
  : undefined;

const supportedOAuthOrigins = !isLovableSandbox
  ? ["https://oauth.lovable.app", "https://lovable.dev", lovableSandboxUrl]
  : undefined;

const lovableAuth = createLovableAuth({
  oauthBrokerUrl,
  supportedOAuthOrigins,
});

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple" | "microsoft" | "lovable", opts?: SignInOptions) => {
      const result = await lovableAuth.signInWithOAuth(provider, {
        redirect_uri: opts?.redirect_uri,
        extraParams: {
          ...opts?.extraParams,
        },
      });

      if (result.redirected) {
        return result;
      }

      if (result.error) {
        return result;
      }

      try {
        await supabase.auth.setSession(result.tokens);
      } catch (e) {
        return { error: e instanceof Error ? e : new Error(String(e)) };
      }
      return result;
    },
  },
};
