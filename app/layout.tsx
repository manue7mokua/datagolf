import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const departureMono = localFont({
  src: "../fonts/DepartureMono-1.500/DepartureMono-Regular.woff2",
  variable: "--font-sans",
  display: "swap",
  fallback: ["monospace"],
});

export const metadata: Metadata = {
  title: "DataGolf | Under Construction",
  description: "Temporary landing page while the full site is being built.",
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
