import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(publicMediaPattern ? [publicMediaPattern] : []),
    ],
  },
};

export default nextConfig;
