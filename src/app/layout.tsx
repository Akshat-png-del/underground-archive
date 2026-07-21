import type { Metadata } from "next";
import { Space_Grotesk, Instrument_Serif, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo/metadata";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GrainOverlay } from "@/components/ui/ArchivePrimitives";
import { AppProviders } from "@/components/providers/AppProviders";
import { PlaybackRoot } from "@/components/music/PlaybackRoot";
import { PlaybackUiInvariantGuard } from "@/components/music/PlaybackUiInvariantGuard";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/seo/jsonld";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  ...buildMetadata({
    title: siteConfig.tagline,
    description: siteConfig.description,
    path: "/",
    keywords: [
      "underground techno",
      "hard techno",
      "schranz",
      "EBM",
      "darkwave",
      "techwear",
      "rave culture",
      "Berlin techno",
    ],
  }),
  metadataBase: new URL(siteConfig.url),
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#080808",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${instrumentSerif.variable} ${ibmPlexMono.variable} h-full`}
    >
      <head>
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <AppProviders>
          <GrainOverlay />
          <Header />
          <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
          <Footer />
          <PlaybackRoot />
          <PlaybackUiInvariantGuard />
        </AppProviders>
      </body>
    </html>
  );
}
