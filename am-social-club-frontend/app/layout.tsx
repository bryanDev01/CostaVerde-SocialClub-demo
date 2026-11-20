import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { AuthProvider } from "./providers";
import { ConnectionStatus } from "@/components/Common/ConnectionStatus";
import { BRAND } from "@/lib/branding";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Self-hosted to avoid fetching Google Fonts at build/dev time
// (Turbopack cannot resolve the remote font module on restricted networks).
const fraunces = localFont({
  src: "./fonts/Fraunces-latin.woff2",
  variable: "--font-fraunces",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: BRAND.copy.metadataTitle,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.copy.metadataDescription,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ConnectionStatus />
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="top-right"
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "rounded-xl border border-border bg-background text-foreground shadow-lg",
              title: "text-sm font-semibold",
              description: "text-sm text-muted-foreground",
              actionButton: "bg-primary text-primary-foreground",
              cancelButton: "bg-muted text-foreground",
              error: "border-danger/30 text-danger",
              success: "border-primary/30 text-primary",
            },
          }}
        />
      </body>
    </html>
  );
}
