import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GitHub Stats",
  description: "GitHub analytics dashboard. Explore contributions, languages, streaks, and more for any GitHub user.",
  openGraph: {
    title: "GitHub Stats",
    description: "GitHub analytics dashboard. Explore contributions, languages, streaks, and more for any GitHub user.",
    url: "https://ghstats.fun",
    siteName: "GitHub Stats",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GitHub Stats Dashboard Preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitHub Stats",
    description: "GitHub analytics dashboard. Explore contributions, languages, streaks, and more for any GitHub user.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-neutral-950 text-neutral-100`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
