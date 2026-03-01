"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark";
type Difficulty = "easy" | "normal" | "hard";

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  userId: string;
  setUserId: (id: string) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  score: number;
  setScore: (s: number) => void;
  highScore: number;
  setHighScore: (s: number) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [userId, setUserIdState] = useState("");
  const [difficulty, setDifficultyState] = useState<Difficulty>("normal");
  const [score, setScore] = useState(0);
  const [highScore, setHighScoreState] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("snake_theme") as Theme | null;
    const savedUser = localStorage.getItem("snake_user_id") || "";
    const savedDifficulty = localStorage.getItem("snake_difficulty") as Difficulty | null;
    const savedHighScore = parseInt(localStorage.getItem("snake_high_score") || "0", 10);

    if (savedTheme) setThemeState(savedTheme);
    if (savedUser) setUserIdState(savedUser);
    if (savedDifficulty) setDifficultyState(savedDifficulty);
    setHighScoreState(savedHighScore);
    setMounted(true);
  }, []);

  // Sync theme class on <html>
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("snake_theme", theme);
  }, [theme, mounted]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const setUserId = useCallback((id: string) => {
    setUserIdState(id);
    localStorage.setItem("snake_user_id", id);
  }, []);

  const setDifficulty = useCallback((d: Difficulty) => {
    setDifficultyState(d);
    localStorage.setItem("snake_difficulty", d);
  }, []);

  const setHighScore = useCallback((s: number) => {
    setHighScoreState(s);
    localStorage.setItem("snake_high_score", s.toString());
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div style={{ background: "#0a0a0f", minHeight: "100vh" }} />
    );
  }

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        userId,
        setUserId,
        difficulty,
        setDifficulty,
        score,
        setScore,
        highScore,
        setHighScore,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
