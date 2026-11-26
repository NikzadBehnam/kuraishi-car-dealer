import type { NextConfig } from "next";
import { allowsSearchIndexing } from "./src/lib/search-indexing";

const publicBucket = process.env.MEDIA_PUBLIC_BUCKET;
const publicMediaPattern = publicBucket
  ? (() => {
      const endpointValue = process.env.AWS_ENDPOINT_URL_S3;
      if (!endpointValue) {
        throw new Error(
          "AWS_ENDPOINT_URL_S3 is required when MEDIA_PUBLIC_BUCKET is configured.",
        );
      }

      const endpoint = new URL(endpointValue);
      if (
        endpoint.protocol !== "https:" ||
        endpoint.pathname !== "/" ||
        endpoint.username ||
        endpoint.password ||
        endpoint.search ||
        endpoint.hash
      ) {
        throw new Error("AWS_ENDPOINT_URL_S3 must be an HTTPS origin.");
      }
      if (publicBucket === process.env.MEDIA_PRIVATE_BUCKET) {
        throw new Error(
          "The private and public media buckets must be different.",
        );
      }

      return {
        protocol: "https" as const,
        hostname: endpoint.hostname,
        pathname: `/${publicBucket}/**`,
        search: "",
      };
    })()
  : null;

const privateNoStoreHeader = {
  key: "Cache-Control",
  value: "private, no-store, max-age=0, must-revalidate",
};

const nextConfig: NextConfig = {
  logging: {
    // Staff account creation sends credentials as server-action arguments.
    serverFunctions: false,
    incomingRequests: {
      ignore: [/^\/(?:login|admin\/accounts\/new|api\/auth)(?:[/?]|$)/],
    },
  },
  images: {
    remotePatterns: publicMediaPattern ? [publicMediaPattern] : [],
  },
  async headers() {
    return [
      ...(!allowsSearchIndexing()
        ? [
            {
              source: "/:path*",
              headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
            },
          ]
        : []),
      { source: "/admin/:path*", headers: [privateNoStoreHeader] },
      { source: "/api/:path*", headers: [privateNoStoreHeader] },
    ];
  },
};

export default nextConfig;
