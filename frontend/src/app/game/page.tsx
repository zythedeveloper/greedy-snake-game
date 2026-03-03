"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

const GRID_SIZE = 20;
const CELL_COUNT = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_COUNT; // 400px

const SPEED_MAP = { easy: 150, normal: 100, hard: 60 } as const;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Feature flags ───────────────────────────────────────────────────────────
const SCORING_CONFIG = {
	// Base points per apple per difficulty
	difficultyPoints: { easy: 1, normal: 3, hard: 5 } as Record<
		string,
		number
	>,

	// Combo multiplier: eating apples within comboWindowMs stacks the multiplier
	comboEnabled: true,
	comboWindowMs: 5000,

	// Freshness bonus: apple spawns with full bonus that decays to 0 over time
	freshnessEnabled: true,
	freshnessWindowMs: 8000,

	// Special apple varieties
	specialApplesEnabled: true,
	goldenChance: 0.5, // 5% — worth 5× base OR shrinks snake tail
	poisonChance: 0.15, // 15% — deducts points and spikes speed for 1.5s

	// Length bonus: adds snake.length to points earned (before multiplier)
	lengthBonusEnabled: true,

	// Multi-apple system: spawns a random new apple every X seconds up to max
	multiAppleEnabled: true,
	maxApples: 5,
	minSpawnTimeMs: 2000,
	maxSpawnTimeMs: 4000,
	appleLifespanMs: 10000, // Apples despawn after 5 seconds
};
// ─────────────────────────────────────────────────────────────────────────────

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Point = { x: number; y: number };
type FoodType = "normal" | "golden" | "poison";

type ActiveApple = {
	id: string;
	pos: Point;
	type: FoodType;
	spawnTime: number;
};

function randomPosition(snake: Point[]): Point {
	let food: Point;
	do {
		food = {
			x: Math.floor(Math.random() * CELL_COUNT),
			y: Math.floor(Math.random() * CELL_COUNT),
		};
	} while (snake.some((s) => s.x === food.x && s.y === food.y));
	return food;
}

function rollFoodType(): FoodType {
	if (!SCORING_CONFIG.specialApplesEnabled) return "normal";
	const r = Math.random();
	if (r < SCORING_CONFIG.goldenChance) return "golden";
	if (r < SCORING_CONFIG.goldenChance + SCORING_CONFIG.poisonChance)
		return "poison";
	return "normal";
}

export default function GamePage() {
	const router = useRouter();
	const {
		userId,
		difficulty,
		theme,
		score,
		setScore,
		highScore,
		setHighScore,
		isGuest,
		guestName,
	} = useApp();
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const [gameState, setGameState] = useState<
		"idle" | "playing" | "paused" | "over"
	>("idle");
	const [finalScore, setFinalScore] = useState(0);
	const [scoreSaved, setScoreSaved] = useState(false);
	const [displayMultiplier, setDisplayMultiplier] = useState(1);

	// ─── Core game refs ───
	const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
	const dirRef = useRef<Direction>("RIGHT");
	const nextDirRef = useRef<Direction>("RIGHT");
	const scoreRef = useRef(0);
	const gameOverRef = useRef(false);
	const lastTickRef = useRef(0);

	// ─── Advanced scoring / multi-apple refs ───
	const activeApplesRef = useRef<ActiveApple[]>([]);
	const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const multiplierRef = useRef(1);
	const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const speedBoostRef = useRef(false); // poison temporary speed spike
	const speedBoostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// ─── Theme-derived colors ───
	const colors =
		theme === "dark"
			? {
				bg: "#121212",
				snake: "#39FF14",
				snakeHead: "#7FFF5C",
				fruit: "#FF3131",
				grid: "rgba(255,255,255,0.03)",
				text: "#39FF14",
			}
			: {
				bg: "#F5F5F5",
				snake: "#2D5A27",
				snakeHead: "#4A8C3F",
				fruit: "#D32F2F",
				grid: "rgba(0,0,0,0.05)",
				text: "#2D5A27",
			};

	const getCurrentSpeed = useCallback(() => {
		const base = SPEED_MAP[difficulty];
		return speedBoostRef.current ? Math.max(30, Math.floor(base * 0.4)) : base;
	}, [difficulty]);

	// ─── Spawning Logic ───
	const scheduleNextSpawn = useCallback(() => {
		if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);

		const delay =
			Math.random() *
			(SCORING_CONFIG.maxSpawnTimeMs - SCORING_CONFIG.minSpawnTimeMs) +
			SCORING_CONFIG.minSpawnTimeMs;

		spawnTimerRef.current = setTimeout(() => {
			if (gameOverRef.current) return;

			// Add a new apple if under limit
			if (activeApplesRef.current.length < SCORING_CONFIG.maxApples) {
				const allOccupied = [
					...snakeRef.current,
					...activeApplesRef.current.map((a) => a.pos),
				];
				activeApplesRef.current.push({
					id: Math.random().toString(36).substr(2, 9),
					pos: randomPosition(allOccupied),
					type: rollFoodType(),
					spawnTime: Date.now(),
				});
			}

			// Queue the next spawn regardless
			scheduleNextSpawn();
		}, delay);
	}, []);

	const spawnAppleImmediately = useCallback((snake: Point[]) => {
		const allOccupied = [...snake, ...activeApplesRef.current.map((a) => a.pos)];
		activeApplesRef.current.push({
			id: Math.random().toString(36).substr(2, 9),
			pos: randomPosition(allOccupied),
			type: rollFoodType(),
			spawnTime: Date.now(),
		});
	}, []);

	// ─── Drawing ───
	const draw = useCallback(
		(ctx: CanvasRenderingContext2D) => {
			const snake = snakeRef.current;

			// Background
			ctx.fillStyle = colors.bg;
			ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

			// Grid
			ctx.strokeStyle = colors.grid;
			ctx.lineWidth = 1;
			for (let i = 0; i <= CELL_COUNT; i++) {
				ctx.beginPath();
				ctx.moveTo(i * GRID_SIZE, 0);
				ctx.lineTo(i * GRID_SIZE, CANVAS_SIZE);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, i * GRID_SIZE);
				ctx.lineTo(CANVAS_SIZE, i * GRID_SIZE);
				ctx.stroke();
			}

			// Snake
			snake.forEach((seg, i) => {
				ctx.fillStyle = i === 0 ? colors.snakeHead : colors.snake;
				ctx.fillRect(
					seg.x * GRID_SIZE + 1,
					seg.y * GRID_SIZE + 1,
					GRID_SIZE - 2,
					GRID_SIZE - 2,
				);
				// Eyes on head
				if (i === 0) {
					ctx.fillStyle = colors.bg;
					const ex1 = seg.x * GRID_SIZE + 5;
					const ey1 = seg.y * GRID_SIZE + 6;
					const ex2 = seg.x * GRID_SIZE + 13;
					ctx.fillRect(ex1, ey1, 3, 3);
					ctx.fillRect(ex2, ey1, 3, 3);
				}
			});

			// Food / Apples
			const now = Date.now();

			activeApplesRef.current.forEach((apple) => {
				const pulse = Math.sin(now / 200) * 2;
				const { pos, type } = apple;

				if (type === "golden") {
					// Golden apple — warm shimmer + larger pulse
					const gPulse = Math.sin(now / 150) * 3;
					ctx.fillStyle = "#FFD700";
					ctx.fillRect(
						pos.x * GRID_SIZE + 1 - gPulse / 2,
						pos.y * GRID_SIZE + 1 - gPulse / 2,
						GRID_SIZE - 2 + gPulse,
						GRID_SIZE - 2 + gPulse,
					);
					// Star-like shine
					ctx.fillStyle = "rgba(255,255,200,0.7)";
					ctx.fillRect(pos.x * GRID_SIZE + 3, pos.y * GRID_SIZE + 3, 5, 2);
					ctx.fillRect(pos.x * GRID_SIZE + 3, pos.y * GRID_SIZE + 3, 2, 5);
					// Outer glow ring
					ctx.strokeStyle = "rgba(255,215,0,0.4)";
					ctx.lineWidth = 2;
					ctx.strokeRect(
						pos.x * GRID_SIZE - 1,
						pos.y * GRID_SIZE - 1,
						GRID_SIZE + 2,
						GRID_SIZE + 2,
					);
				} else if (type === "poison") {
					// Poison apple — purple with dark shimmer
					const pPhase = Math.sin(now / 250);
					ctx.fillStyle = `hsl(270, 100%, ${40 + pPhase * 10}%)`;
					ctx.fillRect(
						pos.x * GRID_SIZE + 2 - pulse / 2,
						pos.y * GRID_SIZE + 2 - pulse / 2,
						GRID_SIZE - 4 + pulse,
						GRID_SIZE - 4 + pulse,
					);
					// Skull-ish shine
					ctx.fillStyle = "rgba(200,150,255,0.5)";
					ctx.fillRect(pos.x * GRID_SIZE + 4, pos.y * GRID_SIZE + 4, 3, 3);
					// Outer glow ring
					ctx.strokeStyle = "rgba(139,0,255,0.4)";
					ctx.lineWidth = 2;
					ctx.strokeRect(
						pos.x * GRID_SIZE - 1,
						pos.y * GRID_SIZE - 1,
						GRID_SIZE + 2,
						GRID_SIZE + 2,
					);
				} else {
					// Normal apple — original style
					ctx.fillStyle = colors.fruit;
					ctx.fillRect(
						pos.x * GRID_SIZE + 2 - pulse / 2,
						pos.y * GRID_SIZE + 2 - pulse / 2,
						GRID_SIZE - 4 + pulse,
						GRID_SIZE - 4 + pulse,
					);
					ctx.fillStyle = "rgba(255,255,255,0.3)";
					ctx.fillRect(pos.x * GRID_SIZE + 4, pos.y * GRID_SIZE + 4, 4, 4);
				}
			});
		},
		[colors],
	);

	// ─── Game tick ───
	const tick = useCallback(() => {
		const snake = [...snakeRef.current];
		dirRef.current = nextDirRef.current;
		const head = { ...snake[0] };

		switch (dirRef.current) {
			case "UP":
				head.y--;
				break;
			case "DOWN":
				head.y++;
				break;
			case "LEFT":
				head.x--;
				break;
			case "RIGHT":
				head.x++;
				break;
		}

		// Wall collision
		if (
			head.x < 0 ||
			head.x >= CELL_COUNT ||
			head.y < 0 ||
			head.y >= CELL_COUNT
		) {
			gameOverRef.current = true;
			return;
		}
		// Self collision
		if (snake.some((s) => s.x === head.x && s.y === head.y)) {
			gameOverRef.current = true;
			return;
		}

		snake.unshift(head);

		// Eat any apple?
		const eatenIdx = activeApplesRef.current.findIndex(
			(a) => head.x === a.pos.x && head.y === a.pos.y,
		);

		if (eatenIdx !== -1) {
			const eatenApples = activeApplesRef.current.splice(eatenIdx, 1);
			const eaten = eatenApples[0];

			const base =
				SCORING_CONFIG.difficultyPoints[difficulty] ??
				SCORING_CONFIG.difficultyPoints["normal"];

			// Freshness bonus
			let freshnessBonus = 0;
			if (SCORING_CONFIG.freshnessEnabled) {
				const elapsed = Date.now() - eaten.spawnTime;
				const ratio = Math.max(
					0,
					1 - elapsed / SCORING_CONFIG.freshnessWindowMs,
				);
				freshnessBonus = Math.round(base * ratio);
			}

			// Length bonus (snake.length already includes new head from unshift)
			const lengthBonus = SCORING_CONFIG.lengthBonusEnabled ? snake.length : 0;

			let pointsEarned = base + freshnessBonus + lengthBonus;

			if (eaten.type === "golden") {
				const shrink = Math.random() < 0.5;
				if (shrink && snake.length > 2) {
					// Shrink: remove up to 3 tail segments
					const remove = Math.min(3, snake.length - 2);
					snake.splice(snake.length - remove, remove);
				}
				pointsEarned *= 5;
			} else if (eaten.type === "poison") {
				// Deduct base points and spike speed for 1.5s
				pointsEarned = -base;

				if (SCORING_CONFIG.specialApplesEnabled) {
					speedBoostRef.current = true;
					if (speedBoostTimerRef.current)
						clearTimeout(speedBoostTimerRef.current);
					speedBoostTimerRef.current = setTimeout(() => {
						speedBoostRef.current = false;
					}, 1500);
				}
			}

			// Apply combo multiplier
			if (SCORING_CONFIG.comboEnabled && eaten.type !== "poison") {
				pointsEarned = Math.round(pointsEarned * multiplierRef.current);

				// Chain: increment multiplier and reset timer
				if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
				multiplierRef.current = Math.min(multiplierRef.current + 1, 10);
				setDisplayMultiplier(multiplierRef.current);

				comboTimerRef.current = setTimeout(() => {
					multiplierRef.current = 1;
					setDisplayMultiplier(1);
				}, SCORING_CONFIG.comboWindowMs);
			}

			scoreRef.current = Math.max(0, scoreRef.current + pointsEarned);
			setScore(scoreRef.current);

			// If we ate the last apple, force spawn immediately to avoid an empty board
			if (activeApplesRef.current.length === 0) {
				spawnAppleImmediately(snake);
			}
		} else {
			snake.pop();
		}

		// Despawn old apples
		const now = Date.now();
		const oldLength = activeApplesRef.current.length;
		activeApplesRef.current = activeApplesRef.current.filter(
			(a) => now - a.spawnTime <= SCORING_CONFIG.appleLifespanMs,
		);

		// If all apples despawned and none eaten, ensure we have at least 1
		if (
			oldLength > 0 &&
			activeApplesRef.current.length === 0 &&
			eatenIdx === -1
		) {
			spawnAppleImmediately(snake);
		}

		snakeRef.current = snake;
	}, [setScore, difficulty, spawnAppleImmediately]);

	// ─── Game loop (uses dynamic speed) ───
	useEffect(() => {
		if (gameState !== "playing") return;

		const ctx = canvasRef.current?.getContext("2d");
		if (!ctx) return;

		let rafId: number;

		const loop = (timestamp: number) => {
			if (gameOverRef.current) {
				const final = scoreRef.current;
				setFinalScore(final);
				setGameState("over");
				if (final > highScore) setHighScore(final);
				return;
			}

			const currentSpeed = getCurrentSpeed();
			if (timestamp - lastTickRef.current >= currentSpeed) {
				tick();
				lastTickRef.current = timestamp;
			}

			draw(ctx);
			rafId = requestAnimationFrame(loop);
		};

		rafId = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(rafId);
	}, [gameState, tick, draw, highScore, setHighScore, getCurrentSpeed]);

	// ─── Keyboard ───
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (gameState === "idle" && (e.key === " " || e.key === "Enter")) {
				startGame();
				return;
			}

			const dir = dirRef.current;
			switch (e.key) {
				case "ArrowUp":
				case "w":
				case "W":
					if (dir !== "DOWN") nextDirRef.current = "UP";
					break;
				case "ArrowDown":
				case "s":
				case "S":
					if (dir !== "UP") nextDirRef.current = "DOWN";
					break;
				case "ArrowLeft":
				case "a":
				case "A":
					if (dir !== "RIGHT") nextDirRef.current = "LEFT";
					break;
				case "ArrowRight":
				case "d":
				case "D":
					if (dir !== "LEFT") nextDirRef.current = "RIGHT";
					break;
			}
		};

		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [gameState]);

	// ─── Touch controls ───
	useEffect(() => {
		if (gameState !== "playing") return;

		let touchStartX = 0;
		let touchStartY = 0;

		const handleTouchStart = (e: TouchEvent) => {
			touchStartX = e.touches[0].clientX;
			touchStartY = e.touches[0].clientY;
		};

		const handleTouchEnd = (e: TouchEvent) => {
			const dx = e.changedTouches[0].clientX - touchStartX;
			const dy = e.changedTouches[0].clientY - touchStartY;
			const dir = dirRef.current;

			if (Math.abs(dx) > Math.abs(dy)) {
				if (dx > 0 && dir !== "LEFT") nextDirRef.current = "RIGHT";
				else if (dx < 0 && dir !== "RIGHT") nextDirRef.current = "LEFT";
			} else {
				if (dy > 0 && dir !== "UP") nextDirRef.current = "DOWN";
				else if (dy < 0 && dir !== "DOWN") nextDirRef.current = "UP";
			}
		};

		window.addEventListener("touchstart", handleTouchStart);
		window.addEventListener("touchend", handleTouchEnd);
		return () => {
			window.removeEventListener("touchstart", handleTouchStart);
			window.removeEventListener("touchend", handleTouchEnd);
		};
	}, [gameState]);

	// ─── Save score on game over ───
	useEffect(() => {
		if (gameState !== "over" || scoreSaved) return;

		setScoreSaved(true);

		const body = isGuest
			? {
				score: finalScore,
				difficulty,
				theme,
				is_guest: true,
				guest_name: guestName || undefined,
			}
			: { score: finalScore, difficulty, theme };

		fetch("/api/scores/save", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}).catch(console.error);
	}, [
		gameState,
		scoreSaved,
		isGuest,
		guestName,
		finalScore,
		difficulty,
		theme,
	]);

	// ─── Start / Restart logic ───
	const startGame = useCallback(() => {
		snakeRef.current = [{ x: 10, y: 10 }];
		dirRef.current = "RIGHT";
		nextDirRef.current = "RIGHT";
		scoreRef.current = 0;
		gameOverRef.current = false;
		lastTickRef.current = 0;

		// Reset scoring state
		multiplierRef.current = 1;
		setDisplayMultiplier(1);
		if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
		if (speedBoostTimerRef.current) clearTimeout(speedBoostTimerRef.current);
		speedBoostRef.current = false;

		// Multi-apple start
		activeApplesRef.current = [];
		if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
		spawnAppleImmediately([{ x: 10, y: 10 }]);

		setScore(0);
		setScoreSaved(false);
		setGameState("playing");

		// Kick off loop
		scheduleNextSpawn();
	}, [scheduleNextSpawn, spawnAppleImmediately, setScore]);

	// ─── Draw idle screen ───
	useEffect(() => {
		if (gameState !== "idle") return;
		const ctx = canvasRef.current?.getContext("2d");
		if (!ctx) return;
		draw(ctx);
	}, [gameState, draw]);

	return (
		<div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-8">
			{/* HUD */}
			<div className="w-full max-w-[400px] mb-3 flex items-center justify-between bg-hud-bg backdrop-blur-sm border-2 border-card-border px-4 py-2 font-pixel">
				<div className="flex items-center gap-2 text-[0.45rem] text-muted">
					SCORE: <span className="text-accent">{score}</span>
					{displayMultiplier > 1 && (
						<span
							className="text-[0.4rem] px-1 py-0.5 animate-combo-pop"
							style={{
								background: "rgba(255,215,0,0.15)",
								border: "1px solid #FFD700",
								color: "#FFD700",
							}}
						>
							x{displayMultiplier}
						</span>
					)}
				</div>
				<div className="text-[0.45rem] text-muted">
					BEST: <span className="text-fruit">{highScore}</span>
				</div>
				<button
					id="quit-btn"
					onClick={() => router.push("/")}
					className="text-[0.4rem] text-muted hover:text-fruit transition-colors"
				>
					✕ QUIT
				</button>
			</div>

			{/* Canvas wrapper */}
			<div className="relative pixel-card p-0 overflow-hidden">
				<canvas
					ref={canvasRef}
					width={CANVAS_SIZE}
					height={CANVAS_SIZE}
					className="block"
				/>

				{/* Idle overlay */}
				{gameState === "idle" && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
						<p className="text-accent text-[0.6rem] font-pixel mb-4 animate-glow">
							READY?
						</p>
						<button
							id="play-btn"
							onClick={startGame}
							className="pixel-btn bg-btn-primary text-background border-btn-primary-hover hover:bg-btn-primary-hover"
						>
							▶ PLAY
						</button>
						<p className="text-muted text-[0.4rem] mt-3">
							or press SPACE / ENTER
						</p>
					</div>
				)}

				{/* Game over overlay */}
				{gameState === "over" && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm">
						<p className="text-fruit text-[0.7rem] font-pixel mb-2 animate-blink">
							GAME OVER
						</p>
						<p className="text-accent text-[0.55rem] font-pixel mb-6">
							SCORE: {finalScore}
						</p>
						<div className="flex gap-3">
							<button
								id="retry-btn"
								onClick={startGame}
								className="pixel-btn bg-btn-primary text-background border-btn-primary-hover hover:bg-btn-primary-hover"
							>
								↻ RETRY
							</button>
							<button
								id="home-btn"
								onClick={() => router.push("/")}
								className="pixel-btn bg-transparent text-muted border-card-border hover:text-accent hover:border-accent"
							>
								🏠 HOME
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Controls hint */}
			<p className="text-[0.35rem] text-muted/50 mt-4 text-center tracking-wider">
				WASD / ARROW KEYS / SWIPE TO MOVE
			</p>

			{/* Apple legend */}
			{SCORING_CONFIG.specialApplesEnabled && (
				<div className="flex gap-4 mt-2 text-[0.3rem] text-muted/60 font-pixel">
					<span>
						<span style={{ color: "#FFD700" }}>■</span> GOLDEN = 5×
					</span>
					<span>
						<span style={{ color: "#8B00FF" }}>■</span> POISON = −PTS
					</span>
				</div>
			)}
		</div>
	);
}
