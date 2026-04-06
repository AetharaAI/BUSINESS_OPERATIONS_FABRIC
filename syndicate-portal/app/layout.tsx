import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Syndicate Voice Portal",
  description: "Customer-facing portal for Syndicate AI Voice Agents"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
