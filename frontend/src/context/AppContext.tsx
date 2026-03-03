"use client";

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
} from "react";

type Theme = "light" | "dark";
type Difficulty = "easy" | "normal" | "hard";

export interface UserProfile {
	id: string;
	name: string;
	email: string;
	image?: string | null;
}

interface AppContextType {
	theme: Theme;
	toggleTheme: () => void;
	setTheme: (t: Theme) => void;
	// Auth state
	userProfile: UserProfile | null;
	setUserProfile: (u: UserProfile | null) => void;
	isGuest: boolean;
	guestName: string;
	setGuestMode: (name: string) => void;
	clearSession: () => void;
	// Legacy helpers
	userId: string;
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
	const [difficulty, setDifficultyState] = useState<Difficulty>("normal");
	const [score, setScore] = useState(0);
	const [highScore, setHighScoreState] = useState(0);
	const [mounted, setMounted] = useState(false);

	// Auth state
	const [userProfile, setUserProfileState] = useState<UserProfile | null>(
		null,
	);
	const [isGuest, setIsGuest] = useState(false);
	const [guestName, setGuestName] = useState("");

	// Hydrate from localStorage
	useEffect(() => {
		const savedTheme = localStorage.getItem("snake_theme") as Theme | null;
		const savedDifficulty = localStorage.getItem(
			"snake_difficulty",
		) as Difficulty | null;
		const savedHighScore = parseInt(
			localStorage.getItem("snake_high_score") || "0",
			10,
		);
		const savedProfile = localStorage.getItem("snake_user_profile");
		const savedGuest = localStorage.getItem("snake_guest_name");

		if (savedTheme) setThemeState(savedTheme);
		if (savedDifficulty) setDifficultyState(savedDifficulty);
		setHighScoreState(savedHighScore);

		if (savedProfile) {
			try {
				setUserProfileState(JSON.parse(savedProfile));
			} catch {
				/* ignore */
			}
		} else if (savedGuest) {
			setIsGuest(true);
			setGuestName(savedGuest);
		}

		setMounted(true);
	}, []);

	// Sync theme
	useEffect(() => {
		if (!mounted) return;
		document.documentElement.classList.toggle("dark", theme === "dark");
		localStorage.setItem("snake_theme", theme);
	}, [theme, mounted]);

	const setTheme = useCallback((t: Theme) => setThemeState(t), []);
	const toggleTheme = useCallback(() => {
		setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
	}, []);

	const setDifficulty = useCallback((d: Difficulty) => {
		setDifficultyState(d);
		localStorage.setItem("snake_difficulty", d);
	}, []);

	const setHighScore = useCallback((s: number) => {
		setHighScoreState(s);
		localStorage.setItem("snake_high_score", s.toString());
	}, []);

	const setUserProfile = useCallback((u: UserProfile | null) => {
		setUserProfileState(u);
		setIsGuest(false);
		setGuestName("");
		if (u) {
			localStorage.setItem("snake_user_profile", JSON.stringify(u));
			localStorage.removeItem("snake_guest_name");
		} else {
			localStorage.removeItem("snake_user_profile");
		}
	}, []);

	const setGuestMode = useCallback((name: string) => {
		setIsGuest(true);
		setGuestName(name);
		setUserProfileState(null);
		localStorage.setItem("snake_guest_name", name);
		localStorage.removeItem("snake_user_profile");
	}, []);

	const clearSession = useCallback(() => {
		setUserProfileState(null);
		setIsGuest(false);
		setGuestName("");
		localStorage.removeItem("snake_user_profile");
		localStorage.removeItem("snake_guest_name");
	}, []);

	// Derived legacy userId for game page
	const userId = userProfile?.id ?? (isGuest ? guestName : "");

	if (!mounted) {
		return <div style={{ background: "#0a0a0f", minHeight: "100vh" }} />;
	}

	return (
		<AppContext.Provider
			value={{
				theme,
				toggleTheme,
				setTheme,
				userProfile,
				setUserProfile,
				isGuest,
				guestName,
				setGuestMode,
				clearSession,
				userId,
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
