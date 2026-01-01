import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GitHub Stats",
  description: "GitHub analytics dashboard. Explore contributions, languages, streaks, and more for any GitHub user.",
  metadataBase: new URL("https://ghstats.fun"),
  openGraph: {
    title: "GitHub Stats",
    description: "GitHub analytics dashboard. Explore contributions, languages, streaks, and more for any GitHub user.",
    siteName: "GitHub Stats",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitHub Stats",
    description: "GitHub analytics dashboard. Explore contributions, languages, streaks, and more for any GitHub user.",
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
