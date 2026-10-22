import type { Metadata, Viewport } from "next";
import { Noto_Sans_Bengali } from "next/font/google";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import AuthProvider from "@/components/providers/AuthProvider";
import MetaPixel from "@/components/providers/MetaPixel";
import GoogleAnalytics from "@/components/providers/GoogleAnalytics";
import { Toaster } from "sonner";
import "./globals.css";
import "./mobile.css";

// ─── CONSISTENT TYPOGRAPHY: Noto Sans Bengali ────────────────────────────
// Clean, professional font as requested, moving away from AI-generated looks.
const notoSansBengali = Noto_Sans_Bengali({
  variable: "--font-body",
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "EvoRise Media | ক্রিয়েটিভ মিডিয়া ও মিউজিক একাডেমি",
    template: "%s | EvoRise Media",
  },
  description:
    "EvoRise Media — শীর্ষস্থানীয় মিডিয়া ও মিউজিক একাডেমি। আমাদের প্রধান প্রশিক্ষক ও বিশিষ্ট মিউজিক ডিরেক্টর JKH Jesan-এর সাথে শিখুন প্রফেশনাল মিউজিক প্রোডাকশন, মিক্সিং, মাস্টারিং এবং সাউন্ড ডিজাইন।",
  openGraph: {
    siteName: "EvoRise Media",
    title: "EvoRise Media | ক্রিয়েটিভ মিডিয়া ও মিউজিক একাডেমি",
    description: "EvoRise Media-র প্রধান প্রশিক্ষক JKH Jesan-এর সাথে প্রফেশনাল মিউজিক প্রোডাকশন শিখুন।",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1A1F0F",
};

import { prisma } from "@/lib/prisma";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await prisma.setting.findUnique({
    where: { id: "global" }
  });
  const fbPixelId = settings?.facebookPixelId || process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
  const gaId = settings?.googleAnalyticsId || process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

  return (
    <html
      lang="bn"
      className={`${notoSansBengali.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-foreground">
        <AuthProvider>
          <MetaPixel fbPixelId={fbPixelId} />
          <GoogleAnalytics gaId={gaId} />
          <Header />
          <main className="grow">{children}</main>
          <Footer />
          <MobileBottomNav />
          <Toaster richColors theme="dark" />
        </AuthProvider>
      </body>
    </html>
  );
}
