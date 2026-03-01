import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Greedy Snake — Retro Pixel Game",
  description:
    "A retro 8-bit styled Greedy Snake game with leaderboards, guest mode, and dynamic themes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AppProvider>
          <Navbar />
          <main className="pt-14">{children}</main>
        </AppProvider>
      </body>
    </html>
  );
}
