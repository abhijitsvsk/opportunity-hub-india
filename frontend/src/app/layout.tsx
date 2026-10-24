import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import PostHogProvider from "@/components/PostHogProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://opphunt.in'),
  title: {
    default: "Opportunity Hub India — Verified Tech Opportunities",
    template: "%s | OpportunityHub India",
  },
  description: "Aggregating 1,500+ verified internships, hackathons, and open-source programs for Indian CS students.",
  keywords: [
    "tech internships India",
    "hackathons India",
    "CS student internships",
    "software engineer internships India",
    "open source programs",
    "fresher developer jobs",
    "OppHunt",
    "Opportunity Hub India",
    "Indian engineering students"
  ],
  authors: [{ name: "OpportunityHub India" }],
  creator: "OpportunityHub India",
  publisher: "OpportunityHub India",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OppHub",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon.svg" },
    ],
  },
  openGraph: {
    type: "website",
    siteName: "OpportunityHub India",
    locale: "en_IN",
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://opphunt.in',
    title: "Opportunity Hub India — Verified Tech Opportunities",
    description: "Aggregating 1,500+ verified internships, hackathons, and open-source programs for Indian CS students.",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@opphub",
    title: "Opportunity Hub India — Verified Tech Opportunities",
    description: "Aggregating 1,500+ verified internships, hackathons, and open-source programs for Indian CS students.",
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || 'https://opphunt.in',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "NtbGqEFdaFTCasD6t3lYN5ByDNOTQSfPqiC-qggQfxE",
  },
  other: {
    "geo.region": "IN",
    "geo.placename": "India",
    "geo.position": "20.5937;78.9629",
    "ICBM": "20.5937, 78.9629",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans bg-background text-text-main selection:bg-zinc-800 selection:text-white`}
      >
        <ServiceWorkerRegistrar />
        <Suspense fallback={null}>
          <PostHogProvider />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
