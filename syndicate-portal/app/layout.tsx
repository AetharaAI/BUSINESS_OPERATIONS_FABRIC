import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Syndicate Voice Portal",
  description: "Customer-facing portal for Syndicate AI Voice Agents",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
