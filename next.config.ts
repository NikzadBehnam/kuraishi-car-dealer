import type { NextConfig } from "next";
import { allowsSearchIndexing } from "./src/lib/search-indexing";

const privateNoStoreHeader = {
  key: "Cache-Control",
  value: "private, no-store, max-age=0, must-revalidate",
};

const nextConfig: NextConfig = {
  logging: {
    // Staff account creation sends credentials as server-action arguments.
    serverFunctions: false,
    incomingRequests: {
      ignore: [
        /^\/(?:login|admin\/(?:accounts\/new|leads)|api\/auth)(?:[/?]|$)/,
      ],
    },
  },
  images: {
    // The optimizer must not cache photos whose access follows vehicle status.
    localPatterns: [{ pathname: "/images/**", search: "" }],
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
