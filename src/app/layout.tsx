import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WayCode — Ship code from anywhere",
  description:
    "Describe the change in plain language. WayCode branches, codes, builds — you review the diff and ship.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WayCode",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f8f8f6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

import { SmoothScrollProvider } from "@/components/smooth-scroll-provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-full flex flex-col antialiased`}
      >
        <SmoothScrollProvider>
          <div className="ambient-scene" aria-hidden="true">
            <div className="ambient-orb ambient-orb-1" />
            <div className="ambient-orb ambient-orb-2" />
            <div className="ambient-orb ambient-orb-3" />
          </div>

          {children}

          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#ffffff",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                borderRadius: "16px",
                boxShadow: "0 12px 40px -12px rgba(24,30,44,0.25)",
                fontSize: "13px",
              },
            }}
          />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
