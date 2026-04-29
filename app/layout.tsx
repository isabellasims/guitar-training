import type { Metadata, Viewport } from "next";
import { Crimson_Pro, Fraunces, JetBrains_Mono } from "next/font/google";

import { AppProviders } from "@/components/providers/AppProviders";
import { MobileNav } from "@/components/layout/MobileNav";

import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const crimson = Crimson_Pro({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-crimson",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

const APP_NAME = "Tonic";
const APP_DESCRIPTION =
  "Personal guitar theory practice: hear it, find it, play it — with pitch-aware drills.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ede2cd",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${crimson.variable} ${jetbrains.variable} font-sans antialiased`}
      >
        <AppProviders>
          <div className="mx-auto min-h-dvh max-w-lg pb-24 pt-safe">
            {children}
          </div>
          <MobileNav />
        </AppProviders>
      </body>
    </html>
  );
}
