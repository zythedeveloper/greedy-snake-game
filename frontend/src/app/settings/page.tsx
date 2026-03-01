"use client";

import { useApp } from "@/context/AppContext";
import Link from "next/link";

const difficulties = [
    { key: "easy" as const, label: "EASY", desc: "Chill vibes", icon: "🐢", speed: "Slow" },
    { key: "normal" as const, label: "NORMAL", desc: "Classic mode", icon: "🐍", speed: "Medium" },
    { key: "hard" as const, label: "HARD", desc: "God mode", icon: "⚡", speed: "Fast" },
];

export default function SettingsPage() {
    const { theme, toggleTheme, difficulty, setDifficulty } = useApp();

    return (
        <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center px-4 py-10">
            {/* Header */}
            <div className="text-center mb-8">
                <span className="text-3xl mb-2 block">⚙️</span>
                <h1 className="text-accent text-lg font-pixel animate-glow">SETTINGS</h1>
                <p className="text-muted text-[0.4rem] mt-2 tracking-widest">CUSTOMIZE YOUR GAME</p>
            </div>

            <div className="w-full max-w-md space-y-6">
                {/* ── Theme Toggle ── */}
                <div className="pixel-card p-5">
                    <h2 className="text-[0.55rem] font-pixel text-muted mb-4 tracking-wider">
                        🎨 THEME
                    </h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[0.5rem] font-pixel text-foreground">
                                {theme === "dark" ? "🌙 DARK MODE" : "☀️ LIGHT MODE"}
                            </p>
                            <p className="text-[0.35rem] text-muted mt-1">
                                {theme === "dark" ? "Neon green on black" : "Forest green on white"}
                            </p>
                        </div>
                        <button
                            id="theme-toggle-btn"
                            onClick={toggleTheme}
                            className={`
                relative w-14 h-7 rounded-full border-2 transition-all duration-300
                ${theme === "dark"
                                    ? "bg-accent/20 border-accent"
                                    : "bg-muted/20 border-muted"
                                }
              `}
                        >
                            <span
                                className={`
                  absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300
                  ${theme === "dark"
                                        ? "left-7 bg-accent shadow-[0_0_8px_var(--accent)]"
                                        : "left-0.5 bg-muted"
                                    }
                `}
                            />
                        </button>
                    </div>

                    {/* Theme preview swatches */}
                    <div className="mt-4 pt-3 border-t border-card-border flex gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[0.35rem] text-muted">BG</span>
                            <div
                                className="w-6 h-6 border border-card-border"
                                style={{ background: theme === "dark" ? "#121212" : "#F5F5F5" }}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[0.35rem] text-muted">SNAKE</span>
                            <div
                                className="w-6 h-6 border border-card-border"
                                style={{ background: theme === "dark" ? "#39FF14" : "#2D5A27" }}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[0.35rem] text-muted">FRUIT</span>
                            <div
                                className="w-6 h-6 border border-card-border"
                                style={{ background: theme === "dark" ? "#FF3131" : "#D32F2F" }}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Difficulty ── */}
                <div className="pixel-card p-5">
                    <h2 className="text-[0.55rem] font-pixel text-muted mb-4 tracking-wider">
                        🎯 DIFFICULTY
                    </h2>
                    <div className="space-y-2">
                        {difficulties.map((d) => (
                            <button
                                key={d.key}
                                id={`difficulty-${d.key}`}
                                onClick={() => setDifficulty(d.key)}
                                className={`
                  w-full flex items-center justify-between p-3 border-2 transition-all
                  ${difficulty === d.key
                                        ? "border-accent bg-accent/10 text-accent"
                                        : "border-card-border text-muted hover:border-accent/50 hover:text-foreground"
                                    }
                `}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">{d.icon}</span>
                                    <div className="text-left">
                                        <p className="text-[0.45rem] font-pixel">{d.label}</p>
                                        <p className="text-[0.3rem] text-muted mt-0.5">{d.desc}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[0.35rem] font-pixel">{d.speed}</p>
                                    {difficulty === d.key && (
                                        <span className="text-[0.3rem] text-accent">✓ ACTIVE</span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Actions ── */}
                <div className="flex gap-4 justify-center">
                    <Link
                        href="/game"
                        className="pixel-btn bg-btn-primary text-background border-btn-primary-hover hover:bg-btn-primary-hover"
                    >
                        🎮 PLAY
                    </Link>
                    <Link
                        href="/"
                        className="pixel-btn bg-transparent text-muted border-card-border hover:text-accent hover:border-accent"
                    >
                        🏠 HOME
                    </Link>
                </div>
            </div>
        </div>
    );
}
