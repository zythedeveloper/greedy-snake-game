import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
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
				<Providers>
					<Navbar />
					<main className="pt-14">{children}</main>
				</Providers>
			</body>
		</html>
	);
}
