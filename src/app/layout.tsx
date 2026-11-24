import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { siteConfig } from "@/config/site.config";
import { VehicleStateProvider } from "@/components/providers/vehicle-state-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { allowsSearchIndexing } from "@/lib/search-indexing";
const indexable = allowsSearchIndexing();
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.canonicalOrigin),
  title: {
    default: siteConfig.brandName,
    template: `%s | ${siteConfig.brandName}`,
  },
  openGraph: {
    title: siteConfig.brandName,
    type: "website",
    locale: "de_AT",
  },
  robots: { index: indexable, follow: indexable },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={jetBrainsMono.variable}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <VehicleStateProvider>
            {children}
            <Toaster position="bottom-right" richColors />
          </VehicleStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
