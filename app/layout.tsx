import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const departureMono = localFont({
  src: "../fonts/DepartureMono-1.500/DepartureMono-Regular.woff2",
  variable: "--font-sans",
  display: "swap",
  fallback: ["monospace"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  title: "datagolf",
  description: "coding golf for data analysis",
  metadataBase: new URL(siteUrl),
  icons: {
    icon: [{ url: "/datagolf.jpg", type: "image/jpeg" }],
    shortcut: "/datagolf.jpg",
    apple: "/datagolf.jpg",
  },
  openGraph: {
    title: "datagolf",
    description: "coding golf for data analysis",
    type: "website",
    images: [
      {
        url: "/open-graph-image.png",
        width: 1200,
        height: 630,
        alt: "datagolf",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "datagolf",
    description: "coding golf for data analysis",
    images: ["/open-graph-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={departureMono.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
