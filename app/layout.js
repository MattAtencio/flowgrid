import { DM_Serif_Display, Outfit } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata = {
  title: "FlowGrid — Daily Path Puzzle",
  description:
    "Connect color pairs on a grid without crossing paths. New puzzle every day.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FlowGrid",
  },
  openGraph: {
    title: "FlowGrid — Daily Path Puzzle",
    description:
      "Connect color pairs on a grid without crossing paths. New puzzle every day.",
    type: "website",
    siteName: "FlowGrid",
  },
  twitter: {
    card: "summary",
    title: "FlowGrid — Daily Path Puzzle",
    description:
      "Connect color pairs on a grid without crossing paths.",
  },
};

export const viewport = {
  themeColor: "#22c55e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${dmSerif.variable} ${outfit.variable}`}>
        {children}
      </body>
    </html>
  );
}
