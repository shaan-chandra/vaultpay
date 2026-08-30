import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const DESCRIPTION =
  "VaultPay is a payments platform for issuing payment links, collecting card payments and screening every transaction for fraud in real time.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VaultPay — Payments infrastructure",
    template: "%s · VaultPay",
  },
  description: DESCRIPTION,
  applicationName: "VaultPay",
  keywords: [
    "payments",
    "payment links",
    "card payments",
    "fraud detection",
    "merchant dashboard",
  ],
  openGraph: {
    type: "website",
    siteName: "VaultPay",
    title: "VaultPay — Payments infrastructure",
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "VaultPay — Payments infrastructure",
    description: DESCRIPTION,
  },
  icons: { icon: "/favicon.ico" },
  // Authenticated payments product — nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
