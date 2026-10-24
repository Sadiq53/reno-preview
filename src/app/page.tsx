import React from "react";
import type { Metadata } from "next";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesBentoGrid from "@/components/landing/FeaturesBentoGrid";
import ZeroTrustArchitecture from "@/components/landing/ZeroTrustArchitecture";
import WorkflowSection from "@/components/landing/WorkflowSection";
import LiveMetricsSection from "@/components/landing/LiveMetricsSection";
import FaqSection from "@/components/landing/FaqSection";
import CtaSection from "@/components/landing/CtaSection";
import LandingFooter from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "Crewvia Vanguard | Advanced Visual Website Annotator & Zero-Trust WordPress Broker",
  description:
    "The all-in-one executive platform for interactive website preview annotation, responsive multi-device review, and zero-plugin, zero-trust WordPress access brokering for modern web agencies.",
  keywords: [
    "visual website annotator",
    "website feedback tool",
    "zero-trust wordpress broker",
    "agency client review",
    "wordpress developer access without password",
    "responsive website preview",
    "crewvia vanguard",
    "website bug tracking tool",
    "client approval portal",
  ],
  authors: [{ name: "Crewvia Vanguard", url: "https://vanguard.crewvia.in" }],
  creator: "Crewvia Vanguard",
  publisher: "Crewvia",
  metadataBase: new URL("https://vanguard.crewvia.in"),
  alternates: {
    canonical: "https://vanguard.crewvia.in",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://vanguard.crewvia.in",
    title: "Crewvia Vanguard | Advanced Visual Website Annotator & Zero-Trust WordPress Broker",
    description:
      "All-in-one executive platform for interactive website previews, pinpoint visual annotations, and zero-trust WordPress access brokering without plugins.",
    siteName: "Crewvia Vanguard",
    images: [
      {
        url: "/logo/vanguard-horizontal.png",
        width: 1200,
        height: 630,
        alt: "Crewvia Vanguard — Visual Website Annotator & Zero-Trust WordPress Access Broker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Crewvia Vanguard | Visual Website Annotator & Zero-Trust WordPress Broker",
    description:
      "Interactive multi-viewport annotations and zero-trust WordPress access brokering for elite web agencies.",
    images: ["/logo/vanguard-horizontal.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Crewvia Vanguard",
    operatingSystem: "Web Browser",
    applicationCategory: "BusinessApplication",
    description:
      "Executive agency visual website annotator, responsive client review canvas, and zero-trust WordPress access broker.",
    url: "https://vanguard.crewvia.in",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "148",
      bestRating: "5",
      worstRating: "1",
    },
    featureList: [
      "Responsive Multi-Device Visual Annotator (Desktop, Tablet, Mobile)",
      "Zero-Plugin Zero-Trust WordPress Access Broker",
      "Cryptographic Scoped Client Share Links (Viewer vs Commenter)",
      "Real-time Task Progression Kanban with Server-Sent Events (SSE)",
      "Background Web Push Notifications via Firebase Cloud Messaging",
      "AES-256-GCM Master Credential Vault",
    ],
  };

  return (
    <>
      {/* Schema.org Structured Data for SEO Rich Snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex min-h-screen flex-col bg-background text-foreground ambient-canvas">
        {/* Navigation Header */}
        <LandingNavbar />

        {/* Main Content Sections */}
        <main className="flex-1">
          {/* 1. Hero Section with Interactive Canvas Simulator */}
          <HeroSection />

          {/* 2. Four Specialized Feature Modules in Bento Grid */}
          <FeaturesBentoGrid />

          {/* 3. Zero-Trust Security vs Traditional Agency Comparison */}
          <ZeroTrustArchitecture />

          {/* 4. Frictionless 4-Phase Agency Workflow */}
          <WorkflowSection />

          {/* 5. Live Platform Metrics & Social Proof */}
          <LiveMetricsSection />

          {/* 6. Frequently Asked Questions Accordion */}
          <FaqSection />

          {/* 7. High-Converting Bottom CTA Banner */}
          <CtaSection />
        </main>

        {/* Global Footer */}
        <LandingFooter />
      </div>
    </>
  );
}
