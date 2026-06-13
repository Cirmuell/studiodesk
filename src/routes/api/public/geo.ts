import { createFileRoute } from "@tanstack/react-router";

export const config = {
  runtime: "edge",
};

type GeoMapping = {
  currency: string;
  taxRate: number;
  countryName: string;
};

const GEO_MAP: Record<string, GeoMapping> = {
  NG: { currency: "NGN", taxRate: 7.5, countryName: "Nigeria" },
  GH: { currency: "GHS", taxRate: 15.0, countryName: "Ghana" },
  ZA: { currency: "ZAR", taxRate: 15.0, countryName: "South Africa" },
  KE: { currency: "KES", taxRate: 16.0, countryName: "Kenya" },
  US: { currency: "USD", taxRate: 0.0, countryName: "United States" },
  GB: { currency: "GBP", taxRate: 20.0, countryName: "United Kingdom" },
  CA: { currency: "CAD", taxRate: 5.0, countryName: "Canada" },
};

export const Route = createFileRoute("/api/public/geo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const countryHeader =
          request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || "NG";

        const countryCode = countryHeader.toUpperCase();
        const info = GEO_MAP[countryCode] || {
          currency: "NGN",
          taxRate: 7.5,
          countryName: "Nigeria",
        };

        const clientIp =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          "127.0.0.1";

        return new Response(
          JSON.stringify({
            ip: clientIp,
            country: countryCode,
            country_name: info.countryName,
            currency: info.currency,
            vat_rate: info.taxRate,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=3600, s-maxage=86400",
            },
          },
        );
      },
    },
  },
});
