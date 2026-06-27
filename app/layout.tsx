import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Atlas — Trumbull Command Center",
  description:
    "Atlas is Trumbull's multi-marketplace project command center for Amazon, Walmart and Wayfair.",
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-mode="dark" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var m=localStorage.getItem('atlas-theme');document.documentElement.dataset.mode=(m==='light'||m==='dark')?m:'dark';}catch(e){document.documentElement.dataset.mode='dark';}",
          }}
        />
        {children}
      </body>
    </html>
  );
}
