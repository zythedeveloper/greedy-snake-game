"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";

const navLinks = [
	{ href: "/", label: "Home", icon: "🏠" },
	{ href: "/game", label: "Play", icon: "🎮" },
	{ href: "/leaderboard", label: "Scores", icon: "🏆" },
	{ href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Navbar() {
	const pathname = usePathname();
	const { theme, toggleTheme } = useApp();

	return (
		<nav className="fixed top-0 left-0 right-0 z-50 bg-nav-bg backdrop-blur-md border-b-2 border-nav-border">
			<div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
				{/* Logo */}
				<Link href="/" className="flex items-center gap-2 group">
					<span className="text-lg group-hover:animate-glow transition-all">
						🐍
					</span>
					<span className="text-accent font-pixel text-[0.55rem] hidden sm:block tracking-wider">
						SNAKE
					</span>
				</Link>

				{/* Nav links */}
				<div className="flex items-center gap-1">
					{navLinks.map((link) => {
						const isActive = pathname === link.href;
						return (
							<Link
								key={link.href}
								href={link.href}
								className={`
                  px-3 py-2 text-[0.5rem] font-pixel rounded transition-all
                  ${
						isActive
							? "text-accent bg-accent/10 border border-accent/30"
							: "text-muted hover:text-accent hover:bg-accent/5"
					}
                `}
							>
								<span className="sm:hidden">{link.icon}</span>
								<span className="hidden sm:inline">
									{link.label}
								</span>
							</Link>
						);
					})}
				</div>

				{/* Theme toggle */}
				<button
					onClick={toggleTheme}
					className="w-9 h-9 flex items-center justify-center rounded border-2 border-card-border hover:border-accent transition-all text-sm"
					aria-label="Toggle theme"
				>
					{theme === "dark" ? "☀️" : "🌙"}
				</button>
			</div>
		</nav>
	);
}
