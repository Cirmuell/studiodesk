export const config = {
  matcher: "/portal/:path*",
};

export default async function middleware(request: Request) {
  const url = new URL(request.url);

  // Intercept public portal document viewing routes
  if (url.pathname.startsWith("/portal/") && !url.pathname.endsWith("/expired")) {
    const parts = url.pathname.split("/");
    const token = parts[2];

    if (token) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseAnonKey =
        process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (supabaseUrl && supabaseAnonKey) {
        try {
          // Perform a fast, lightweight query to Supabase REST API
          const response = await fetch(
            `${supabaseUrl}/rest/v1/document_shares?token=eq.${token}&select=revoked_at,expires_at`,
            {
              headers: {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${supabaseAnonKey}`,
              },
            },
          );

          if (response.ok) {
            const data = await response.json();
            const share = data[0];

            // If the share link is revoked or expired, redirect instantly at the Edge
            if (
              !share ||
              share.revoked_at ||
              (share.expires_at && new Date(share.expires_at) < new Date())
            ) {
              url.pathname = "/portal/expired";
              return Response.redirect(url.toString(), 307);
            }
          }
        } catch (err) {
          console.error("[Edge Middleware] Token check failed:", err);
        }
      }
    }
  }

  // Continue to the origin server
  return new Response(null, {
    headers: {
      "x-middleware-next": "1",
    },
  });
}
