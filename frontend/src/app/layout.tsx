import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpportunityHub | The Kinetic Engine",
  description: "Aggregating the best tech opportunities for CS students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased font-sans bg-background text-text-main overflow-hidden h-screen w-full flex flex-col`}
      >
        {children}
      </body>
    </html>
  );
}
