"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useApp } from "@/context/AppContext";

type Mode = "main" | "email-login" | "email-signup" | "guest";

export default function LandingPage() {
	const router = useRouter();
	const { setUserProfile, setGuestMode } = useApp();

	const [mode, setMode] = useState<Mode>("main");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [guestInput, setGuestInput] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const resetError = () => setError("");

	// ── Google OAuth ──────────────────────────────────────────────────────────
	const handleGoogle = async () => {
		setLoading(true);
		await signIn("google", { callbackUrl: "/game" });
	};

	// ── Email/Password login ──────────────────────────────────────────────────
	const handleEmailLogin = async () => {
		setLoading(true);
		resetError();
		try {
			const res = await signIn("credentials", {
				email,
				password,
				redirect: false,
			});
			if (res?.error) {
				setError("Invalid email or password.");
			} else {
				router.push("/game");
			}
		} catch (e) {
			console.error(e);
			setError("Login failed. Check that the backend is running.");
		} finally {
			setLoading(false);
		}
	};

	// ── Sign up ───────────────────────────────────────────────────────────────
	const handleSignUp = async () => {
		setLoading(true);
		resetError();
		try {
			const rawRes = await fetch("/api/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, email, password }),
			});
			const text = await rawRes.text();
			let data: {
				ok?: boolean;
				error?: string;
				user?: { id: string; name: string; email: string };
			} = {};
			try {
				data = JSON.parse(text);
			} catch {
				setError(
					`Server error (${rawRes.status}). Is the backend running?`,
				);
				setLoading(false);
				return;
			}
			if (!rawRes.ok) {
				setError(data.error || "Registration failed.");
				setLoading(false);
				return;
			}
			// Auto-login after registration
			try {
				const loginRes = await signIn("credentials", {
					email,
					password,
					redirect: false,
				});
				if (loginRes?.error) {
					setError("Registered! Please sign in.");
					setMode("email-login");
				} else {
					if (data.user) {
						setUserProfile({
							id: String(data.user.id),
							name: data.user.name,
							email: data.user.email,
						});
					}
					router.push("/game");
				}
			} catch {
				// Registration succeeded but auto-login failed (e.g. AUTH_SECRET not set)
				setError("Account created! Please sign in manually.");
				setMode("email-login");
			}
		} catch (e) {
			console.error(e);
			setError("Unexpected error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	// ── Guest ─────────────────────────────────────────────────────────────────
	const handleGuest = () => {
		const suffix = Math.floor(1000 + Math.random() * 9000);
		const nick = guestInput.trim() || `Guest-${suffix}`;
		setGuestMode(nick);
		router.push("/game");
	};

	// Shared input class
	const inputCls =
		"w-full bg-input-bg border-2 border-input-border text-foreground font-pixel text-xs px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 placeholder:text-muted/50 transition-all";

	return (
		<div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 relative overflow-hidden">
			{/* Floating pixels */}
			<div className="absolute inset-0 pointer-events-none overflow-hidden">
				{[...Array(12)].map((_, i) => (
					<div
						key={i}
						className="absolute w-2 h-2 bg-accent/20 animate-float"
						style={{
							left: `${8 + i * 8}%`,
							top: `${15 + (i % 3) * 25}%`,
							animationDelay: `${i * 0.3}s`,
							animationDuration: `${3 + (i % 3)}s`,
						}}
					/>
				))}
			</div>

			{/* Hero */}
			<div className="text-center mb-10 relative">
				<div className="text-4xl mb-4 animate-float">🐍</div>
				<h1 className="text-accent text-xl sm:text-3xl font-pixel animate-glow leading-relaxed tracking-wide">
					GREEDY SNAKE
				</h1>
				<p className="text-muted text-[0.625rem] mt-3 tracking-widest uppercase">
					A retro pixel adventure
				</p>
				<span className="inline-block mt-2 text-accent text-[0.625rem] animate-blink">
					▶ INSERT COIN ◀
				</span>
			</div>

			{/* Auth Card */}
			<div className="pixel-card p-6 sm:p-8 w-full max-w-md relative scanlines">
				<h2 className="text-xs text-accent mb-6 text-center tracking-wider">
					— PLAYER LOGIN —
				</h2>

				{error && (
					<p className="text-fruit text-[0.625rem] font-pixel mb-4 text-center animate-blink">
						⚠ {error}
					</p>
				)}

				{/* ── Main view ── */}
				{mode === "main" && (
					<div className="space-y-3">
						<button
							id="google-signin-btn"
							onClick={handleGoogle}
							disabled={loading}
							className="pixel-btn w-full bg-btn-primary text-background border-btn-primary-hover hover:bg-btn-primary-hover"
						>
							🌐 Sign in with Google
						</button>

						<button
							id="email-login-btn"
							onClick={() => {
								setMode("email-login");
								resetError();
							}}
							className="pixel-btn w-full bg-transparent text-foreground border-card-border hover:text-accent hover:border-accent"
						>
							✉ Email / Password
						</button>

						<div className="flex items-center gap-3 my-1">
							<div className="flex-1 h-px bg-card-border" />
							<span className="text-muted text-[0.5rem] font-pixel">
								OR
							</span>
							<div className="flex-1 h-px bg-card-border" />
						</div>

						<button
							id="guest-play-btn"
							onClick={() => {
								setMode("guest");
								resetError();
							}}
							className="pixel-btn w-full bg-transparent text-muted border-card-border hover:text-accent hover:border-accent"
						>
							👤 Play as Guest
						</button>
					</div>
				)}

				{/* ── Email login ── */}
				{mode === "email-login" && (
					<div className="space-y-3">
						<input
							id="login-email"
							type="email"
							placeholder="Email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className={inputCls}
						/>
						<input
							id="login-password"
							type="password"
							placeholder="Password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							onKeyDown={(e) =>
								e.key === "Enter" && handleEmailLogin()
							}
							className={inputCls}
						/>
						<button
							id="submit-login-btn"
							onClick={handleEmailLogin}
							disabled={loading}
							className="pixel-btn w-full bg-btn-primary text-background border-btn-primary-hover hover:bg-btn-primary-hover"
						>
							{loading ? "…" : "🔓 Login"}
						</button>
						<div className="flex gap-3">
							<button
								onClick={() => {
									setMode("email-signup");
									resetError();
								}}
								className="flex-1 text-[0.5rem] text-muted hover:text-accent transition-colors font-pixel"
							>
								No account? Sign up
							</button>
							<button
								onClick={() => {
									setMode("main");
									resetError();
								}}
								className="flex-1 text-[0.5rem] text-muted hover:text-accent transition-colors font-pixel"
							>
								← Back
							</button>
						</div>
					</div>
				)}

				{/* ── Email signup ── */}
				{mode === "email-signup" && (
					<div className="space-y-3">
						<input
							id="signup-name"
							type="text"
							placeholder="Name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className={inputCls}
						/>
						<input
							id="signup-email"
							type="email"
							placeholder="Email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className={inputCls}
						/>
						<input
							id="signup-password"
							type="password"
							placeholder="Password (min 6 chars)"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							onKeyDown={(e) =>
								e.key === "Enter" && handleSignUp()
							}
							className={inputCls}
						/>
						<button
							id="submit-signup-btn"
							onClick={handleSignUp}
							disabled={loading}
							className="pixel-btn w-full bg-btn-primary text-background border-btn-primary-hover hover:bg-btn-primary-hover"
						>
							{loading ? "…" : "📝 Create Account"}
						</button>
						<button
							onClick={() => {
								setMode("email-login");
								resetError();
							}}
							className="w-full text-[0.5rem] text-muted hover:text-accent transition-colors font-pixel"
						>
							Already have an account? Sign in
						</button>
					</div>
				)}

				{/* ── Guest ── */}
				{mode === "guest" && (
					<div className="space-y-3">
						<label className="block text-[0.625rem] text-muted mb-1 tracking-wider">
							NICKNAME (optional)
						</label>
						<input
							id="guest-nickname-input"
							type="text"
							placeholder="e.g. SnakeKing42"
							value={guestInput}
							onChange={(e) => setGuestInput(e.target.value)}
							onKeyDown={(e) =>
								e.key === "Enter" && handleGuest()
							}
							className={inputCls}
						/>
						<button
							id="start-guest-btn"
							onClick={handleGuest}
							className="pixel-btn w-full bg-btn-primary text-background border-btn-primary-hover hover:bg-btn-primary-hover"
						>
							🎮 Start as Guest
						</button>
						<button
							onClick={() => {
								setMode("main");
								resetError();
							}}
							className="w-full text-[0.5rem] text-muted hover:text-accent transition-colors font-pixel"
						>
							← Back
						</button>
					</div>
				)}

				<div className="mt-6 pt-4 border-t-2 border-card-border flex justify-center gap-6">
					<button
						onClick={() => router.push("/leaderboard")}
						className="text-muted hover:text-accent transition-colors" style={{ fontSize: 'var(--text-link)' }}
					>
						🏆 Leaderboard
					</button>
					<button
						onClick={() => router.push("/settings")}
						className="text-muted hover:text-accent transition-colors" style={{ fontSize: 'var(--text-link)' }}
					>
						⚙️ Settings
					</button>
				</div>
			</div>

			<p className="text-muted/50 mt-8 tracking-widest" style={{ fontSize: 'var(--text-link)' }}>
				© 2026 GREEDY SNAKE CORP
			</p>
		</div>
	);
}
