import type { Metadata } from "next";
import { Archivo, Source_Sans_3 } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { siteConfig } from "@/config/site.config";
import { VehicleStateProvider } from "@/components/providers/vehicle-state-provider";
import { ThemeProvider } from "@/components/theme-provider";
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL("https://autowelt-rhein.example"),
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  other: { google: "notranslate" },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    type: "website",
    locale: "de_DE",
  },
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="de"
      translate="no"
      className="notranslate"
      suppressHydrationWarning
    >
      <body className={`${sourceSans.variable} ${archivo.variable}`}>
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
