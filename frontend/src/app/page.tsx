"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function LandingPage() {
  const router = useRouter();
  const { userId, setUserId } = useApp();
  const [inputValue, setInputValue] = useState(userId);

  const handleStart = () => {
    setUserId(inputValue.trim());
    router.push("/game");
  };

  const handleGuest = () => {
    setUserId("");
    router.push("/game");
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative floating pixels */}
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
        <p className="text-muted text-[0.5rem] mt-3 tracking-widest uppercase">
          A retro pixel adventure
        </p>
        <span className="inline-block mt-2 text-accent text-[0.5rem] animate-blink">
          ▶ INSERT COIN ◀
        </span>
      </div>

      {/* Auth Card */}
      <div className="pixel-card p-6 sm:p-8 w-full max-w-md relative scanlines">
        <h2 className="text-[0.65rem] text-accent mb-6 text-center tracking-wider">
          — PLAYER LOGIN —
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-[0.5rem] text-muted mb-2 tracking-wider">
              PLAYER ID
            </label>
            <input
              id="player-id-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              placeholder="Enter your name..."
              className="w-full bg-input-bg border-2 border-input-border text-foreground
                         font-pixel text-[0.55rem] px-4 py-3
                         focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
                         placeholder:text-muted/50 transition-all"
            />
          </div>

          <button
            id="start-game-btn"
            onClick={handleStart}
            className="pixel-btn w-full bg-btn-primary text-background border-btn-primary-hover
                       hover:bg-btn-primary-hover"
          >
            🎮 Start Game
          </button>

          <button
            id="guest-play-btn"
            onClick={handleGuest}
            className="pixel-btn w-full bg-transparent text-muted border-card-border
                       hover:text-accent hover:border-accent"
          >
            👤 Play as Guest
          </button>
        </div>

        <div className="mt-6 pt-4 border-t-2 border-card-border flex justify-center gap-6">
          <button
            onClick={() => router.push("/leaderboard")}
            className="text-[0.5rem] text-muted hover:text-accent transition-colors"
          >
            🏆 Leaderboard
          </button>
          <button
            onClick={() => router.push("/settings")}
            className="text-[0.5rem] text-muted hover:text-accent transition-colors"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="text-[0.4rem] text-muted/50 mt-8 tracking-widest">
        © 2026 GREEDY SNAKE CORP
      </p>
    </div>
  );
}
