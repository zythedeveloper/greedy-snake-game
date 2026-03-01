"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

const GRID_SIZE = 20;
const CELL_COUNT = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_COUNT; // 400px

const SPEED_MAP = { easy: 150, normal: 100, hard: 60 } as const;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Point = { x: number; y: number };

function randomFood(snake: Point[]): Point {
    let food: Point;
    do {
        food = {
            x: Math.floor(Math.random() * CELL_COUNT),
            y: Math.floor(Math.random() * CELL_COUNT),
        };
    } while (snake.some((s) => s.x === food.x && s.y === food.y));
    return food;
}

export default function GamePage() {
    const router = useRouter();
    const { userId, difficulty, theme, score, setScore, highScore, setHighScore } = useApp();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [gameState, setGameState] = useState<"idle" | "playing" | "paused" | "over">("idle");
    const [finalScore, setFinalScore] = useState(0);
    const [scoreSaved, setScoreSaved] = useState(false);

    // Game state refs (to avoid stale closures in the game loop)
    const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
    const foodRef = useRef<Point>(randomFood([{ x: 10, y: 10 }]));
    const dirRef = useRef<Direction>("RIGHT");
    const nextDirRef = useRef<Direction>("RIGHT");
    const scoreRef = useRef(0);
    const gameOverRef = useRef(false);
    const lastTickRef = useRef(0);

    // Theme-derived colors
    const colors =
        theme === "dark"
            ? { bg: "#121212", snake: "#39FF14", snakeHead: "#7FFF5C", fruit: "#FF3131", grid: "rgba(255,255,255,0.03)", text: "#39FF14" }
            : { bg: "#F5F5F5", snake: "#2D5A27", snakeHead: "#4A8C3F", fruit: "#D32F2F", grid: "rgba(0,0,0,0.05)", text: "#2D5A27" };

    const speed = SPEED_MAP[difficulty];

    // ─── Drawing ───
    const draw = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            const snake = snakeRef.current;
            const food = foodRef.current;

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
                // Pixel-perfect: 1px gap for retro look
                ctx.fillRect(
                    seg.x * GRID_SIZE + 1,
                    seg.y * GRID_SIZE + 1,
                    GRID_SIZE - 2,
                    GRID_SIZE - 2
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

            // Food — pulsating effect
            const pulse = Math.sin(Date.now() / 200) * 2;
            ctx.fillStyle = colors.fruit;
            ctx.fillRect(
                food.x * GRID_SIZE + 2 - pulse / 2,
                food.y * GRID_SIZE + 2 - pulse / 2,
                GRID_SIZE - 4 + pulse,
                GRID_SIZE - 4 + pulse
            );
            // Shine on food
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.fillRect(
                food.x * GRID_SIZE + 4,
                food.y * GRID_SIZE + 4,
                4,
                4
            );
        },
        [colors]
    );

    // ─── Game tick ───
    const tick = useCallback(() => {
        const snake = [...snakeRef.current];
        dirRef.current = nextDirRef.current;
        const head = { ...snake[0] };

        switch (dirRef.current) {
            case "UP": head.y--; break;
            case "DOWN": head.y++; break;
            case "LEFT": head.x--; break;
            case "RIGHT": head.x++; break;
        }

        // Wall collision
        if (head.x < 0 || head.x >= CELL_COUNT || head.y < 0 || head.y >= CELL_COUNT) {
            gameOverRef.current = true;
            return;
        }
        // Self collision
        if (snake.some((s) => s.x === head.x && s.y === head.y)) {
            gameOverRef.current = true;
            return;
        }

        snake.unshift(head);

        // Eat food?
        if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
            scoreRef.current += 10;
            setScore(scoreRef.current);
            foodRef.current = randomFood(snake);
        } else {
            snake.pop();
        }

        snakeRef.current = snake;
    }, [setScore]);

    // ─── Game loop ───
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

            if (timestamp - lastTickRef.current >= speed) {
                tick();
                lastTickRef.current = timestamp;
            }

            draw(ctx);
            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [gameState, speed, tick, draw, highScore, setHighScore]);

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
        fetch(`${API_URL}/api/save-game`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: userId || "",
                score: finalScore,
                difficulty,
                theme,
            }),
        }).catch(console.error);
    }, [gameState, scoreSaved, userId, finalScore, difficulty, theme]);

    // ─── Start / Restart logic ───
    const startGame = () => {
        snakeRef.current = [{ x: 10, y: 10 }];
        foodRef.current = randomFood([{ x: 10, y: 10 }]);
        dirRef.current = "RIGHT";
        nextDirRef.current = "RIGHT";
        scoreRef.current = 0;
        gameOverRef.current = false;
        lastTickRef.current = 0;
        setScore(0);
        setScoreSaved(false);
        setGameState("playing");
    };

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
                <div className="text-[0.45rem] text-muted">
                    SCORE: <span className="text-accent">{score}</span>
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
        </div>
    );
}
