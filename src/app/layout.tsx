import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { NotificationProvider } from "@/components/notifications/NotificationContext";
import InAppToastContainer from "@/components/notifications/InAppToastContainer";
import ExtensionUpdateBanner from "@/components/extension/ExtensionUpdateBanner";

export const metadata: Metadata = {
  title: "Crewvia Vanguard | Advanced Client Review & Zero-Trust Portal",
  description: "Executive agency client review, interactive website preview annotator, and zero-trust WordPress access broker.",
  icons: {
    icon: "/logo/vanguard-icon.png",
    shortcut: "/logo/vanguard-icon.png",
    apple: "/logo/vanguard-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400;1,9..40,600&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-accent selection:text-accent-foreground"
      >
        <AuthProvider>
          <NotificationProvider>
            <ExtensionUpdateBanner />
            {children}
            <InAppToastContainer />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
