"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

// ─── Constants ────────────────────────────────────────────────────────────────
const TILE_SIZE = 20;

const GRID_COLS: Record<string, number> = { easy: 20, normal: 30, hard: 50 };

const SPEED_MAP: Record<string, number> = { easy: 150, normal: 100, hard: 60 };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Tile types ───────────────────────────────────────────────────────────────
const TILE = {
	CLEAR: 0,
	HAZARD: 1, // lava / ice slip / generic danger
	PORTAL: 2,
	SPECIAL: 3, // mountain / bubble jet / volcano vent
} as const;
type TileType = (typeof TILE)[keyof typeof TILE];

// ─── Biomes ───────────────────────────────────────────────────────────────────
type Biome = "GRASSLAND" | "ICELAND" | "DEEP_SEA" | "VOLCANO";

const BIOMES: Biome[] = ["GRASSLAND", "ICELAND", "DEEP_SEA", "VOLCANO"];

const BIOME_LABELS: Record<Biome, string> = {
	GRASSLAND: "🌿 Grassland",
	ICELAND: "❄️  Iceland",
	DEEP_SEA: "🌊 Deep Sea",
	VOLCANO: "🌋 Volcano",
};

// Biome color palettes
const BIOME_COLORS: Record<
	Biome,
	{
		bg: string;
		grid: string;
		baseTile: string;
		hazard: string;
		special: string;
		snake: string;
		snakeHead: string;
		fruit: string;
		badgeText: string;
	}
> = {
	GRASSLAND: {
		bg: "#0d1a05",
		grid: "rgba(255,255,255,0.03)",
		baseTile: "#1a2e0a",
		hazard: "#5a4020",
		special: "#3d5c1a", // mountain
		snake: "#ffe066",   // bright yellow — pops on green bg
		snakeHead: "#fff5a0",
		fruit: "#ff3366",
		badgeText: "#a3e635", // bright green text
	},
	ICELAND: {
		bg: "#05101a",
		grid: "rgba(200,230,255,0.04)",
		baseTile: "#0a1e30",
		hazard: "#7ec8e3",  // ice — teal-blue
		special: "#50a0e0",
		snake: "#cc44ff",   // vivid purple — contrasts cold blue bg
		snakeHead: "#ee99ff",
		fruit: "#ff5500",   // hot orange on ice
		badgeText: "#7dd3fc", // light blue text
	},
	DEEP_SEA: {
		bg: "#00060f",
		grid: "rgba(0,200,255,0.04)",
		baseTile: "#000d20",
		hazard: "#003050",
		special: "#00e5ff", // bubble jet — bright cyan
		snake: "#39ff14",   // neon green — totally different from blue
		snakeHead: "#aaff88",
		fruit: "#ff8800",   // warm orange on dark navy
		badgeText: "#22d3ee", // cyan text
	},
	VOLCANO: {
		bg: "#100500",
		grid: "rgba(255,60,0,0.05)",
		baseTile: "#1e0a00",
		hazard: "#ff4400",  // lava
		special: "#5c1010", // vent — dark crimson
		snake: "#00ccff",   // cyan — icy contrast on lava-red bg
		snakeHead: "#66eeff",
		fruit: "#aaff00",   // lime on dark
		badgeText: "#f87171", // bright red/orange text
	},
};

// ─── Scoring config ────────────────────────────────────────────────────────────
const SCORING_CONFIG = {
	difficultyPoints: { easy: 1, normal: 3, hard: 5 } as Record<string, number>,
	comboEnabled: true,
	comboWindowMs: 5000,
	freshnessEnabled: true,
	freshnessWindowMs: 8000,
	specialApplesEnabled: true,
	goldenChance: 0.05,
	poisonChance: 0.15,
	lengthBonusEnabled: true,
	multiAppleEnabled: true,
	maxApples: 5,
	minSpawnTimeMs: 2000,
	maxSpawnTimeMs: 4000,
	appleLifespanMs: 10000,
};

// ─── Types ─────────────────────────────────────────────────────────────────────
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Point = { x: number; y: number };
type FoodType = "normal" | "golden" | "poison";

type ActiveApple = {
	id: string;
	pos: Point;
	type: FoodType;
	spawnTime: number;
};

// Extra metadata stored per tile for some biome features
type TileMeta = {
	dir?: Direction;         // bubble jet push direction
	lavaCooldown?: number;   // remaining biome ticks before lava cools (lava HAZARD tiles only)
	isDirectLava?: boolean;  // true = placed directly by vent; cannot spread further
	bubbleExpiry?: number;   // Date.now() ms when this bubble jet tile disappears

	// Multi-block structures
	w?: number;              // width of multi-block structure
	h?: number;              // height of multi-block structure
	isParent?: boolean;      // true if this is the top-left tile of a multi-block structure
	isChild?: boolean;       // true if this is a secondary tile of a multi-block structure
	parentRef?: string;      // key of the parent tile to look up state
	shapeType?: string;      // string for stone shape
	eruptionState?: "dormant" | "erupting" | "active"; // volcano state
	stateEnd?: number;       // Date.now() ms when eruption state changes
};

// ─── Pixel Art ─────────────────────────────────────────────────────────────────
const GRASS_ART = [
	"LMLMMLDLML",
	"MLLMDLLMML",
	"LMDMLMMLDL",
	"MLLLMDMLML",
	"DMLMLLDMLM",
	"MLDMLMLLMD",
	"LMLMDLMLMM",
	"MMLLMDMLMD",
	"DMLMLMDLML",
	"MLDMLMMLMM"
];

const DIRT_ART = [
	"LMDMMDLMMD",
	"MLLDMGDLLM",
	"MMLMMLDMMD",
	"DMLDMLMDML",
	"LGDMMDLLMM",
	"MMDMLMDLMD",
	"MDLMLLDMLL",
	"LMMDGDLMDM",
	"MMLLMMLDLM",
	"DMLMDLMMLL"
];

const SAND_ART = [
	"LWMLLDMLWM",
	"LLMWWMDLLL",
	"DMLWMLLMDW",
	"MMDLLWDMLM",
	"LWMWMLLLLD",
	"DMLWMMWDML",
	"MLLLDMWMLL",
	"WMLLDMWLWM",
	"LLWWMLMDLL",
	"MMLDMLLMWM"
];

const VOLCANO_ART = [
	"   ####   ",
	"  #RRRR#  ",
	" #RBRRBR# ",
	" #BBRRBB# ",
	"#BBBRRBBB#",
	"#BBBRRBBB#",
	"#BBRRRRBB#",
	"#BBRRRRBB#",
	"#BBBBBBBB#",
	"##########",
];

const ICE_ART = [
	"BBBBWWBBBB",
	"BBBBBBBBWL",
	"BBBBBBBBBB",
	"BBLLBBBBBB",
	"WLLBBBBBBB",
	"LLBBBBBBBB",
	"BBBBBBBWLL",
	"BBBBBBBBWL",
	"BBBLLBBBBB",
	"BBBWLBBBBB"
];

const MOSSY_STONE_ART = [
	"GMSLMGMSLL",
	"MMGDDLMMGS",
	"BSGSSDSMMS",
	"DBLMMMSGSS",
	"SLLGMMBSSD",
	"SSMMSGSSLS",
	"GMSDDSMMLS",
	"MMLSSMSSDG",
	"BSLLSMMSMM",
	"DDDBSDSBSS"
];

const LAVA_ART = [
	"ODDDDDOODD",
	"DDODDDDOOD",
	"DOOOYDDDDO",
	"DOOOYDDDDO",
	"DOOOOYDODO",
	"DDDDDOOOOD",
	"DDOODOYOYD",
	"DDOODOYOYD",
	"DDDDOOYYDD",
	"DDDDOOOODD"
];

const DEEP_SEA_ART = [
	"LLLLLLMMMM",
	"LMMMLLLMMM",
	"HLMMLLHLLL",
	"HHMMMLLLHL",
	"HLLLLLHHHH",
	"LMMMLLLLHH",
	"LLMMMMHHLH",
	"HLLLMMHHLH",
	"HHLLLLLLLL",
	"HMMMLLHLLL"
];

const SEA_ART = [
	"MMMMMLMMMM",
	"LMMLLHMMMM",
	"MMMMMMMMMM",
	"MMMMMMMMLM",
	"MMLMMMMMMM",
	"MMMMMMMMMM",
	"LMMMMLMMMM",
	"MMLLHMMMMM",
	"MMMMMMMMLL",
	"MMMMMMMMMM"
];

const VOLCANO_STONE_ART = [
	"BBBBBBBBBB",
	"BHHHHHHHMB",
	"BHMMMMMMDB",
	"BHMMMMMMDB",
	"BHMHHMMMDB",
	"BHMMMMMMDB",
	"BHMMMHHMDB",
	"BHMMMMMMDB",
	"BMMMMMDDDB",
	"BBBBBBBBBB"
];

function drawPixelArt(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	art: string[],
	palette: Record<string, string>,
) {
	const rows = art.length;
	const cols = art[0].length;
	const pWidth = w / cols;
	const pHeight = h / rows;

	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const char = art[r][c];
			if (char !== " " && palette[char]) {
				ctx.fillStyle = palette[char];
				ctx.fillRect(Math.floor(x + c * pWidth), Math.floor(y + r * pHeight), Math.ceil(pWidth), Math.ceil(pHeight));
			}
		}
	}
}

// ─── Map helpers ───────────────────────────────────────────────────────────────
function makeGrid(cols: number, rows: number): TileType[][] {
	return Array.from({ length: rows }, () => Array(cols).fill(TILE.CLEAR));
}

function floodFill(
	grid: TileType[][],
	startX: number,
	startY: number,
	cols: number,
	rows: number,
): number {
	const visited = new Set<string>();
	const key = (x: number, y: number) => `${x},${y}`;
	const stack: Point[] = [{ x: startX, y: startY }];
	let count = 0;

	while (stack.length) {
		const { x, y } = stack.pop()!;
		const k = key(x, y);
		if (visited.has(k)) continue;
		visited.add(k);
		if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
		if (grid[y][x] === TILE.SPECIAL) continue; // mountains / vents block movement
		count++;
		stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
	}
	return count;
}

function clearSafeZone(
	grid: TileType[][],
	meta: Map<string, TileMeta>,
	spawnX: number,
	spawnY: number,
	cols: number,
	rows: number,
	safeTile: TileType = TILE.CLEAR,
) {
	for (let dy = -2; dy <= 2; dy++) {
		for (let dx = -2; dx <= 2; dx++) {
			const x = spawnX + dx;
			const y = spawnY + dy;
			if (x >= 0 && x < cols && y >= 0 && y < rows) {
				grid[y][x] = safeTile;
				meta.delete(`${x},${y}`);
			}
		}
	}
}

function generateMap(
	biome: Biome,
	cols: number,
	rows: number,
	spawnX: number,
	spawnY: number,
): { grid: TileType[][]; meta: Map<string, TileMeta> } {
	const meta = new Map<string, TileMeta>();
	let grid: TileType[][];
	const total = cols * rows;

	for (let attempt = 0; attempt < 6; attempt++) {
		grid = makeGrid(cols, rows);

		if (biome === "GRASSLAND") {
			// Outer most tile is Dirt (HAZARD). Rest is Grass (CLEAR).
			for (let y = 0; y < rows; y++) {
				for (let x = 0; x < cols; x++) {
					if (y === 0 || y === rows - 1 || x === 0 || x === cols - 1) {
						grid[y][x] = TILE.HAZARD;
					}
				}
			}

			// Scatter 10-18 stone clusters of various shapes
			const count = 10 + Math.floor(Math.random() * 9);

			type ShapeDef = { w: number; h: number; type: string; mask: number[][] };
			const SHAPES: ShapeDef[] = [
				{ w: 1, h: 1, type: "single", mask: [[1]] },
				{ w: 2, h: 1, type: "two", mask: [[1, 1]] },
				{
					w: 2, h: 2, type: "L", mask: [
						[1, 0],
						[1, 1]
					]
				},
				{
					w: 3, h: 2, type: "T", mask: [
						[1, 1, 1],
						[0, 1, 0]
					]
				},
				{
					w: 3, h: 3, type: "cross", mask: [
						[0, 1, 0],
						[1, 1, 1],
						[0, 1, 0]
					]
				}
			];

			for (let i = 0; i < count; i++) {
				const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
				const mx = Math.floor(Math.random() * (cols - shape.w));
				const my = Math.floor(Math.random() * (rows - shape.h));

				for (let dy = 0; dy < shape.h; dy++) {
					for (let dx = 0; dx < shape.w; dx++) {
						if (shape.mask[dy][dx] === 1) {
							const tx = mx + dx;
							const ty = my + dy;
							grid[ty][tx] = TILE.SPECIAL;
							meta.set(`${tx},${ty}`, { isChild: false, shapeType: shape.type });
						}
					}
				}
			}
		} else if (biome === "ICELAND") {
			// Outer tile is Sea (CLEAR). All base tiles are Ice (HAZARD).
			// Randomly generate some 'break ice' which are also Sea (CLEAR).

			// Fill everywhere with Ice (HAZARD) except the 1-tile border
			for (let y = 1; y < rows - 1; y++) {
				for (let x = 1; x < cols - 1; x++) {
					grid[y][x] = TILE.HAZARD;
				}
			}

			// Scatter 10–20 'break ice' (Sea) patches (1x1 to 2x2)
			const count = 10 + Math.floor(Math.random() * 10);
			const cx = Math.floor(cols / 2);
			const cy = Math.floor(rows / 2);

			for (let i = 0; i < count; i++) {
				const w = 1 + Math.floor(Math.random() * 2);
				const h = 1 + Math.floor(Math.random() * 2);
				const ix = 1 + Math.floor(Math.random() * (cols - w - 2));
				const iy = 1 + Math.floor(Math.random() * (rows - h - 2));
				for (let dy = 0; dy < h; dy++) {
					for (let dx = 0; dx < w; dx++) {
						const tx = ix + dx;
						const ty = iy + dy;
						// Enforce a generous 7x7 safe zone in the center (dx/dy from center <= 3)
						// This ensures no piece of a 2x2 sea patch bleeds into the start area
						if (Math.abs(tx - cx) <= 3 && Math.abs(ty - cy) <= 3) {
							continue;
						}
						grid[ty][tx] = TILE.CLEAR;
					}
				}
			}
		} else if (biome === "DEEP_SEA") {
			// Outer most tile is Sand (HAZARD). Rest is Sea (CLEAR).
			for (let y = 0; y < rows; y++) {
				for (let x = 0; x < cols; x++) {
					if (y === 0 || y === rows - 1 || x === 0 || x === cols - 1) {
						grid[y][x] = TILE.HAZARD;
					}
				}
			}
		} else if (biome === "VOLCANO") {
			// Outer most tile is Lava (HAZARD). Rest is Stone (CLEAR). 
			for (let y = 0; y < rows; y++) {
				for (let x = 0; x < cols; x++) {
					if (y === 0 || y === rows - 1 || x === 0 || x === cols - 1) {
						grid[y][x] = TILE.HAZARD;
					}
				}
			}

			// Place 3–5 volcano vents (SPECIAL, T-shape). 
			// When active, the vent itself temporarily turns into bubbling lava.
			const ventCount = 3 + Math.floor(Math.random() * 3);
			const baseNow = Date.now();
			for (let i = 0; i < ventCount; i++) {
				const w = 3;
				const h = 2;
				const vx = 1 + Math.floor(Math.random() * (cols - w - 1));
				const vy = 1 + Math.floor(Math.random() * (rows - h - 1));
				for (let dy = 0; dy < h; dy++) {
					for (let dx = 0; dx < w; dx++) {
						if (dy === 0 && (dx === 0 || dx === 2)) continue; // Empty top corners
						const tx = vx + dx;
						const ty = vy + dy;
						grid[ty][tx] = TILE.SPECIAL;
						if (dy === 0 && dx === 1) {
							const rand = Math.random();
							let state: "dormant" | "erupting" | "active" = "dormant";
							let end = baseNow;
							if (rand < 0.4) {
								state = "dormant";
								end += 1000 + Math.random() * 4000;
							} else if (rand < 0.7) {
								state = "erupting";
								end += 1000 + Math.random() * 1500;
							} else {
								state = "active";
								end += 1000 + Math.random() * 3000;
							}
							meta.set(`${tx},${ty}`, {
								w, h,
								isParent: true,
								eruptionState: state,
								stateEnd: end
							});
						} else {
							meta.set(`${tx},${ty}`, { isChild: true, parentRef: `${vx + 1},${vy}` });
						}
					}
				}
			}
		}

		// Enforce safe zone
		const cx = Math.floor(cols / 2);
		const cy = Math.floor(rows / 2);
		const safeTile = biome === "ICELAND" ? TILE.HAZARD : TILE.CLEAR;
		clearSafeZone(grid!, meta, cx, cy, cols, rows, safeTile);

		// Connectivity check ≥ 80% clear tiles
		const reachable = floodFill(grid!, spawnX, spawnY, cols, rows);
		let clearCount = 0;
		for (let y = 0; y < rows; y++)
			for (let x = 0; x < cols; x++)
				if (grid![y][x] !== TILE.SPECIAL) clearCount++;

		if (reachable >= clearCount * 0.8) {
			return { grid: grid!, meta };
		}
	}

	// Fallback: return empty map
	return { grid: makeGrid(cols, rows), meta };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GamePage() {
	const router = useRouter();
	const { userId, difficulty, theme, score, setScore, highScore, setHighScore, isGuest, guestName } =
		useApp();

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const viewportRef = useRef<HTMLDivElement>(null);
	const canvasWrapRef = useRef<HTMLDivElement>(null);

	const [gameState, setGameState] = useState<"idle" | "selecting_biome" | "playing" | "paused" | "over">("idle");
	const [finalScore, setFinalScore] = useState(0);
	const [scoreSaved, setScoreSaved] = useState(false);
	const [displayMultiplier, setDisplayMultiplier] = useState(1);
	const [activeBiome, setActiveBiome] = useState<Biome>("GRASSLAND");
	const [globalBest, setGlobalBest] = useState<number | null>(null);

	// Fetch global top score on mount
	useEffect(() => {
		fetch(`${API_URL}/api/leaderboard`)
			.then((res) => res.json())
			.then((data) => {
				if (Array.isArray(data) && data.length > 0) {
					// The top score is the first entry
					setGlobalBest(data[0].score);
				}
			})
			.catch(console.error);
	}, []);
	const [slideActive, setSlideActive] = useState(false);

	// ─── Core game refs ───
	const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
	const dirRef = useRef<Direction>("RIGHT");
	const nextDirRef = useRef<Direction>("RIGHT");
	const hasStartedRef = useRef(false); // Waits for first input
	const scoreRef = useRef(0);
	const gameOverRef = useRef(false);
	const lastTickRef = useRef(0);
	const biomeTickCountRef = useRef(0);

	// ─── Grid refs ───
	const gridRef = useRef<TileType[][]>([]);
	const gridMetaRef = useRef<Map<string, TileMeta>>(new Map());
	const biomeRef = useRef<Biome>("GRASSLAND");
	const colsRef = useRef(20);
	const rowsRef = useRef(20);

	// ─── Camera ref ───
	const cameraRef = useRef({ x: 0, y: 0 });

	// ─── Advanced scoring / multi-apple refs ───
	const activeApplesRef = useRef<ActiveApple[]>([]);
	const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const multiplierRef = useRef(1);
	const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const speedBoostRef = useRef(false);
	const speedBoostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const iceSlideRef = useRef(false); // sliding extra step
	const iceSlideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// ─── Derived ──────────────────────────────────────────────────────────────
	const getGridSize = useCallback(
		() => GRID_COLS[difficulty] ?? 20,
		[difficulty],
	);

	const biomeColors = useCallback(
		() => BIOME_COLORS[biomeRef.current],
		[],
	);

	const getCurrentSpeed = useCallback(() => {
		let s = SPEED_MAP[difficulty] ?? 100;
		if (speedBoostRef.current) s = Math.max(30, s * 0.6);
		if (biomeRef.current === "ICELAND") s = Math.max(30, s * 0.7); // 30% faster on ice
		return s;
	}, [difficulty]);

	// ─── Tile helpers ─────────────────────────────────────────────────────────
	const getTile = useCallback((x: number, y: number): TileType => {
		const g = gridRef.current;
		if (!g.length) return TILE.CLEAR;
		const row = g[y];
		if (!row) return TILE.CLEAR;
		return (row[x] ?? TILE.CLEAR) as TileType;
	}, []);

	const setTile = useCallback((x: number, y: number, t: TileType) => {
		if (gridRef.current[y]) gridRef.current[y][x] = t;
	}, []);

	// ─── Random position avoiding hazard tiles ────────────────────────────────
	const randomPosition = useCallback(
		(occupied: Point[]): Point => {
			const cols = colsRef.current;
			const rows = rowsRef.current;
			let pos: Point;
			let tries = 0;
			do {
				pos = {
					x: Math.floor(Math.random() * cols),
					y: Math.floor(Math.random() * rows),
				};
				tries++;
			} while (
				tries < 500 &&
				(occupied.some((o) => o.x === pos.x && o.y === pos.y) ||
					getTile(pos.x, pos.y) !== TILE.CLEAR)
			);
			return pos;
		},
		[getTile],
	);

	function rollFoodType(): FoodType {
		if (!SCORING_CONFIG.specialApplesEnabled) return "normal";
		const r = Math.random();
		if (r < SCORING_CONFIG.goldenChance) return "golden";
		if (r < SCORING_CONFIG.goldenChance + SCORING_CONFIG.poisonChance) return "poison";
		return "normal";
	}

	// ─── Biome tick ───────────────────────────────────────────────────────────
	const biomeTick = useCallback(() => {
		const meta = gridMetaRef.current;
		const now = Date.now();

		if (biomeRef.current === "VOLCANO") {
			// Manage Eruption State Machine
			for (const [key, m] of meta.entries()) {
				if (m.isParent && m.eruptionState && m.stateEnd) {
					if (now >= m.stateEnd) {
						if (m.eruptionState === "dormant") {
							m.eruptionState = "erupting";
							m.stateEnd = now + 2000; // erupting for 2s (shaking phase)
						} else if (m.eruptionState === "erupting") {
							m.eruptionState = "active";
							m.stateEnd = now + 5000; // active for 5s (lava out)
						} else if (m.eruptionState === "active") {
							m.eruptionState = "dormant";
							m.stateEnd = now + 4000 + Math.random() * 4000; // dormant for 4-8s
						}
					}
				}
			}
		}

		if (biomeRef.current === "DEEP_SEA") {
			// Bubble logic removed
		}
	}, [getTile, setTile]);

	// ─── Apple spawning ───────────────────────────────────────────────────────
	const scheduleNextSpawn = useCallback(() => {
		if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
		const delay =
			Math.random() * (SCORING_CONFIG.maxSpawnTimeMs - SCORING_CONFIG.minSpawnTimeMs) +
			SCORING_CONFIG.minSpawnTimeMs;
		spawnTimerRef.current = setTimeout(() => {
			if (gameOverRef.current) return;
			if (activeApplesRef.current.length < SCORING_CONFIG.maxApples) {
				const occupied = [
					...snakeRef.current,
					...activeApplesRef.current.map((a) => a.pos),
				];
				activeApplesRef.current.push({
					id: Math.random().toString(36).substr(2, 9),
					pos: randomPosition(occupied),
					type: rollFoodType(),
					spawnTime: Date.now(),
				});
			}
			scheduleNextSpawn();
		}, delay);
	}, [randomPosition]);

	const spawnAppleImmediately = useCallback(
		(snake: Point[]) => {
			const occupied = [...snake, ...activeApplesRef.current.map((a) => a.pos)];
			activeApplesRef.current.push({
				id: Math.random().toString(36).substr(2, 9),
				pos: randomPosition(occupied),
				type: rollFoodType(),
				spawnTime: Date.now(),
			});
		},
		[randomPosition],
	);

	// ─── Camera update ────────────────────────────────────────────────────────
	const updateCamera = useCallback(() => {
		if (!viewportRef.current || !canvasWrapRef.current) return;

		if (difficulty === "easy" || difficulty === "normal") {
			cameraRef.current = { x: 0, y: 0 };
			canvasWrapRef.current.style.transform = `translate3d(0px, 0px, 0)`;
			return;
		}

		const head = snakeRef.current[0];
		const vw = viewportRef.current.clientWidth;
		const vh = viewportRef.current.clientHeight;
		const canvasW = colsRef.current * TILE_SIZE;
		const canvasH = rowsRef.current * TILE_SIZE;

		const rawX = head.x * TILE_SIZE + TILE_SIZE / 2 - vw / 2;
		const rawY = head.y * TILE_SIZE + TILE_SIZE / 2 - vh / 2;
		const cx = Math.max(0, Math.min(rawX, canvasW - vw));
		const cy = Math.max(0, Math.min(rawY, canvasH - vh));

		cameraRef.current = { x: cx, y: cy };
		canvasWrapRef.current.style.transform = `translate3d(${-cx}px, ${-cy}px, 0)`;
	}, [difficulty]);

	// ─── Drawing ──────────────────────────────────────────────────────────────
	const draw = useCallback(
		(ctx: CanvasRenderingContext2D) => {
			const cols = colsRef.current;
			const rows = rowsRef.current;
			const pal = biomeColors();
			const grid = gridRef.current;
			const meta = gridMetaRef.current;
			const snake = snakeRef.current;
			const canvasW = cols * TILE_SIZE;
			const canvasH = rows * TILE_SIZE;

			// Background
			ctx.fillStyle = pal.bg;
			ctx.fillRect(0, 0, canvasW, canvasH);

			// Draw tiles
			if (grid.length) {
				// Pass 1: Base backgrounds (Floor / Hazard)
				for (let y = 0; y < rows; y++) {
					for (let x = 0; x < cols; x++) {
						const tile = grid[y]?.[x];
						if (tile === undefined) continue;

						const px = x * TILE_SIZE;
						const py = y * TILE_SIZE;

						if (biomeRef.current === "VOLCANO") {
							// Lava
							if (tile === TILE.HAZARD) {
								const now = Date.now();
								const pulse = 0.5 + 0.5 * Math.sin(now / 150 + x + y);
								ctx.globalAlpha = 0.8 + 0.2 * pulse;
								drawPixelArt(ctx, px, py, TILE_SIZE, TILE_SIZE, LAVA_ART, {
									"D": "#CD3E1D", "O": "#DE6B2E", "Y": "#EBC754",
								});
								ctx.globalAlpha = 1;
							} else {
								// Stone floor (drawn under everything else)
								drawPixelArt(ctx, px, py, TILE_SIZE, TILE_SIZE, VOLCANO_STONE_ART, {
									"B": "#1A1A1A", "D": "#2F3238", "M": "#41454D", "H": "#5A5E66"
								});
							}
						} else if (biomeRef.current === "ICELAND") {
							if (tile === TILE.CLEAR) {
								const now = Date.now();
								const wave = 0.5 + 0.5 * Math.sin(now / 400 + x * 0.5 + y * 0.5);
								ctx.globalAlpha = 0.85 + 0.15 * wave;
								drawPixelArt(ctx, px, py, TILE_SIZE, TILE_SIZE, SEA_ART, {
									"L": "#3A61F0", "M": "#2A4BE0", "H": "#4B76FE",
								});
								ctx.globalAlpha = 1;
							} else if (tile === TILE.HAZARD) {
								drawPixelArt(ctx, px, py, TILE_SIZE, TILE_SIZE, ICE_ART, {
									"B": "#8BAFE0", "W": "#FFFFFF", "L": "#C4D6ED", "D": "#7096CC"
								});
							}
						} else if (biomeRef.current === "GRASSLAND") {
							// Grassland backgrounds
							if (tile === TILE.CLEAR || tile === TILE.SPECIAL) {
								drawPixelArt(ctx, px, py, TILE_SIZE, TILE_SIZE, GRASS_ART, {
									"L": "#73ab3e", "M": "#5d8a31", "D": "#476b25"
								});
							} else if (tile === TILE.HAZARD) { // Dirt
								drawPixelArt(ctx, px, py, TILE_SIZE, TILE_SIZE, DIRT_ART, {
									"L": "#82552a", "M": "#6e4622", "D": "#5c391a", "G": "#7a7a7a"
								});
							}
						} else if (biomeRef.current === "DEEP_SEA") {
							// Deep Sea backgrounds
							if (tile === TILE.CLEAR) {
								const now = Date.now();
								const wave = 0.5 + 0.5 * Math.sin(now / 500 + x * 0.4 + y * 0.4);
								ctx.globalAlpha = 0.8 + 0.2 * wave;
								drawPixelArt(ctx, px, py, TILE_SIZE, TILE_SIZE, SEA_ART, {
									"H": "#80aaff", "L": "#6699ff", "M": "#5588ff"
								});
								ctx.globalAlpha = 1;
							} else if (tile === TILE.HAZARD) { // DEEP_SEA_ART (original sea art) bounds
								drawPixelArt(ctx, px, py, TILE_SIZE, TILE_SIZE, DEEP_SEA_ART, {
									"L": "rgba(0, 30, 60, 0.9)", "M": "rgba(0, 15, 35, 1)", "H": "rgba(0, 45, 95, 0.8)",
								});
							}
						}
					}
				}

				// Basin effect for Grassland
				if (biomeRef.current === "GRASSLAND") {
					const cx = canvasW / 2;
					const cy = canvasH / 2;
					const radius = Math.max(canvasW, canvasH) / 1.5;
					const grad = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius);
					grad.addColorStop(0, "rgba(0,0,0,0)");
					grad.addColorStop(1, "rgba(0,0,0,0.6)");
					ctx.fillStyle = grad;
					ctx.fillRect(0, 0, canvasW, canvasH);
				}

				// Pass 2: Grid lines (so they stay below entities)
				ctx.strokeStyle = pal.grid;
				ctx.lineWidth = 1;
				for (let i = 0; i <= cols; i++) {
					ctx.beginPath();
					ctx.moveTo(i * TILE_SIZE, 0);
					ctx.lineTo(i * TILE_SIZE, canvasH);
					ctx.stroke();
				}
				for (let i = 0; i <= rows; i++) {
					ctx.beginPath();
					ctx.moveTo(0, i * TILE_SIZE);
					ctx.lineTo(canvasW, i * TILE_SIZE);
					ctx.stroke();
				}

				// Pass 3: Entities (Special TILES)
				for (let y = 0; y < rows; y++) {
					for (let x = 0; x < cols; x++) {
						const tile = grid[y]?.[x];
						if (tile !== TILE.SPECIAL) continue;

						const px = x * TILE_SIZE;
						const py = y * TILE_SIZE;
						const m = meta.get(`${x},${y}`);

						if (biomeRef.current === "GRASSLAND") {
							drawPixelArt(ctx, px, py, TILE_SIZE, TILE_SIZE, MOSSY_STONE_ART, {
								"S": "#7c7c7c", "L": "#999999", "D": "#595959",
								"M": "#4f6b33", "G": "#658a42", "B": "#3a5222"
							});
						} else if (biomeRef.current === "DEEP_SEA") {
							// Special removed
						} else if (biomeRef.current === "VOLCANO") {
							const parentMeta = m?.isParent ? m : m?.parentRef ? meta.get(m.parentRef) : null;
							const state = parentMeta?.eruptionState;

							if (state === "active") {
								const now = Date.now();
								const pulse = 0.5 + 0.5 * Math.sin(now / 150 + x + y);
								ctx.globalAlpha = 0.8 + 0.2 * pulse;
								drawPixelArt(ctx, px, py, TILE_SIZE, TILE_SIZE, LAVA_ART, {
									"D": "#CD3E1D", "O": "#DE6B2E", "Y": "#EBC754", "L": "#FFF0B3",
								});
								ctx.globalAlpha = 1;
								continue;
							}

							if (m?.isChild) continue;

							const W = (m?.w || 1) * TILE_SIZE;
							const H = (m?.h || 1) * TILE_SIZE;
							let drawPx = (m?.w === 3) ? px - TILE_SIZE : px;
							let drawPy = py;

							if (state === "erupting") {
								const shake = (Date.now() % 100 < 50) ? 2 : -2;
								drawPx += shake;
								drawPy += shake;
							}

							drawPixelArt(ctx, drawPx, drawPy, W, H, VOLCANO_ART, {
								"#": "#111111", "R": "#e63946", "B": "#5c3a21"
							});
						}
					}
				}
			}

			// Grid lines
			ctx.strokeStyle = pal.grid;
			ctx.lineWidth = 1;
			for (let i = 0; i <= cols; i++) {
				ctx.beginPath();
				ctx.moveTo(i * TILE_SIZE, 0);
				ctx.lineTo(i * TILE_SIZE, canvasH);
				ctx.stroke();
			}
			for (let i = 0; i <= rows; i++) {
				ctx.beginPath();
				ctx.moveTo(0, i * TILE_SIZE);
				ctx.lineTo(canvasW, i * TILE_SIZE);
				ctx.stroke();
			}

			// Snake
			snake.forEach((seg, i) => {
				ctx.fillStyle = i === 0 ? pal.snakeHead : pal.snake;
				ctx.fillRect(seg.x * TILE_SIZE + 1, seg.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
				if (i === 0) {
					ctx.fillStyle = pal.bg;
					ctx.fillRect(seg.x * TILE_SIZE + 5, seg.y * TILE_SIZE + 6, 3, 3);
					ctx.fillRect(seg.x * TILE_SIZE + 13, seg.y * TILE_SIZE + 6, 3, 3);
				}
			});

			// Apples
			const now = Date.now();
			activeApplesRef.current.forEach((apple) => {
				const pulse = Math.sin(now / 200) * 2;
				const { pos, type } = apple;
				const px = pos.x * TILE_SIZE;
				const py = pos.y * TILE_SIZE;

				if (type === "golden") {
					const gPulse = Math.sin(now / 150) * 3;
					ctx.fillStyle = "#FFD700";
					ctx.fillRect(
						px + 1 - gPulse / 2,
						py + 1 - gPulse / 2,
						TILE_SIZE - 2 + gPulse,
						TILE_SIZE - 2 + gPulse,
					);
					ctx.fillStyle = "rgba(255,255,200,0.7)";
					ctx.fillRect(px + 3, py + 3, 5, 2);
					ctx.fillRect(px + 3, py + 3, 2, 5);
					ctx.strokeStyle = "rgba(255,215,0,0.4)";
					ctx.lineWidth = 2;
					ctx.strokeRect(px - 1, py - 1, TILE_SIZE + 2, TILE_SIZE + 2);
				} else if (type === "poison") {
					const pPhase = Math.sin(now / 250);
					ctx.fillStyle = `hsl(270, 100%, ${40 + pPhase * 10}%)`;
					ctx.fillRect(px + 2 - pulse / 2, py + 2 - pulse / 2, TILE_SIZE - 4 + pulse, TILE_SIZE - 4 + pulse);
					ctx.fillStyle = "rgba(200,150,255,0.5)";
					ctx.fillRect(px + 4, py + 4, 3, 3);
					ctx.strokeStyle = "rgba(139,0,255,0.4)";
					ctx.lineWidth = 2;
					ctx.strokeRect(px - 1, py - 1, TILE_SIZE + 2, TILE_SIZE + 2);
				} else {
					ctx.fillStyle = pal.fruit;
					ctx.fillRect(px + 2 - pulse / 2, py + 2 - pulse / 2, TILE_SIZE - 4 + pulse, TILE_SIZE - 4 + pulse);
					ctx.fillStyle = "rgba(255,255,255,0.3)";
					ctx.fillRect(px + 4, py + 4, 4, 4);
				}
			});
		},
		[biomeColors],
	);

	// ─── Game tick ────────────────────────────────────────────────────────────
	const tick = useCallback(() => {
		if (!hasStartedRef.current) return;

		const snake = [...snakeRef.current];
		dirRef.current = nextDirRef.current;
		const head = { ...snake[0] };
		const cols = colsRef.current;
		const rows = rowsRef.current;

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
		if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
			gameOverRef.current = true;
			return;
		}

		// Self collision
		if (snake.some((s) => s.x === head.x && s.y === head.y)) {
			gameOverRef.current = true;
			return;
		}

		// ─── Biome tile interaction ───
		const tile = getTile(head.x, head.y);
		const biome = biomeRef.current;
		const meta = gridMetaRef.current;

		if (biome === "GRASSLAND") {
			if (tile === TILE.SPECIAL) {
				// Mountain → game over
				gameOverRef.current = true;
				return;
			}
			if (tile === TILE.HAZARD) {
				// Dirt wall → game over
				gameOverRef.current = true;
				return;
			}
		}

		if (biome === "VOLCANO") {
			if (tile === TILE.HAZARD) {
				// Lava → game over
				gameOverRef.current = true;
				return;
			}
			if (tile === TILE.SPECIAL) {
				const m = meta.get(`${head.x},${head.y}`);
				const parentMeta = m?.isParent ? m : m?.parentRef ? meta.get(m.parentRef) : null;
				if (parentMeta?.eruptionState === "active") {
					// Vent turned into lava → game over
					gameOverRef.current = true;
					return;
				}
			}
		}

		if (biome === "ICELAND") {
			// Sea tiles (CLEAR) are now the fatal boundaries / broken ice traps.
			// Ice tiles (HAZARD) are the safe floor.
			if (tile === TILE.CLEAR) {
				gameOverRef.current = true;
				return;
			}

			if (tile === TILE.HAZARD && !iceSlideRef.current) {
				// Ice → slide one extra tile in same direction after short delay
				iceSlideRef.current = true;
				if (iceSlideTimerRef.current) clearTimeout(iceSlideTimerRef.current);
				iceSlideTimerRef.current = setTimeout(() => {
					iceSlideRef.current = false;
					// Trigger an extra tick
					if (!gameOverRef.current) tick();
				}, 80);
			}
		}

		if (biome === "DEEP_SEA") {
			if (tile === TILE.HAZARD) {
				gameOverRef.current = true;
				return;
			}
		}

		snake.unshift(head);

		// Biome tick every 5 game ticks
		biomeTickCountRef.current++;
		if (biomeTickCountRef.current >= 5) {
			biomeTickCountRef.current = 0;
			biomeTick();
		}

		// Eat any apple?
		const eatenIdx = activeApplesRef.current.findIndex(
			(a) => head.x === a.pos.x && head.y === a.pos.y,
		);

		if (eatenIdx !== -1) {
			const eatenApples = activeApplesRef.current.splice(eatenIdx, 1);
			const eaten = eatenApples[0];
			const base =
				SCORING_CONFIG.difficultyPoints[difficulty] ?? SCORING_CONFIG.difficultyPoints["normal"];

			let freshnessBonus = 0;
			if (SCORING_CONFIG.freshnessEnabled) {
				const elapsed = Date.now() - eaten.spawnTime;
				const ratio = Math.max(0, 1 - elapsed / SCORING_CONFIG.freshnessWindowMs);
				freshnessBonus = Math.round(base * ratio);
			}
			const lengthBonus = SCORING_CONFIG.lengthBonusEnabled ? snake.length : 0;
			let pointsEarned = base + freshnessBonus + lengthBonus;

			if (eaten.type === "golden") {
				const shrink = Math.random() < 0.5;
				if (shrink && snake.length > 2) {
					const remove = Math.min(3, snake.length - 2);
					snake.splice(snake.length - remove, remove);
				}
				pointsEarned *= 5;
			} else if (eaten.type === "poison") {
				pointsEarned = -base;
				if (SCORING_CONFIG.specialApplesEnabled) {
					speedBoostRef.current = true;
					if (speedBoostTimerRef.current) clearTimeout(speedBoostTimerRef.current);
					speedBoostTimerRef.current = setTimeout(() => {
						speedBoostRef.current = false;
					}, 1500);
				}
			}

			if (SCORING_CONFIG.comboEnabled && eaten.type !== "poison") {
				pointsEarned = Math.round(pointsEarned * multiplierRef.current);
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
		if (oldLength > 0 && activeApplesRef.current.length === 0 && eatenIdx === -1) {
			spawnAppleImmediately(snake);
		}

		snakeRef.current = snake;
		updateCamera();
	}, [setScore, difficulty, spawnAppleImmediately, getTile, biomeTick, updateCamera]);

	// ─── Game loop ────────────────────────────────────────────────────────────
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
			const speed = getCurrentSpeed();
			if (timestamp - lastTickRef.current >= speed) {
				tick();
				lastTickRef.current = timestamp;
			}
			draw(ctx);
			rafId = requestAnimationFrame(loop);
		};
		rafId = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(rafId);
	}, [gameState, tick, draw, highScore, setHighScore, getCurrentSpeed]);

	// ─── Keyboard ────────────────────────────────────────────────────────────
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (gameState === "idle" && (e.key === " " || e.key === "Enter")) {
				setGameState("selecting_biome");
				return;
			}
			const dir = dirRef.current;
			switch (e.key) {
				case "ArrowUp":
				case "w":
				case "W":
					if (!hasStartedRef.current || dir !== "DOWN") nextDirRef.current = "UP";
					if (gameState === "playing" && !hasStartedRef.current) {
						dirRef.current = "UP";
						hasStartedRef.current = true;
					}
					break;
				case "ArrowDown":
				case "s":
				case "S":
					if (!hasStartedRef.current || dir !== "UP") nextDirRef.current = "DOWN";
					if (gameState === "playing" && !hasStartedRef.current) {
						dirRef.current = "DOWN";
						hasStartedRef.current = true;
					}
					break;
				case "ArrowLeft":
				case "a":
				case "A":
					if (!hasStartedRef.current || dir !== "RIGHT") nextDirRef.current = "LEFT";
					if (gameState === "playing" && !hasStartedRef.current) {
						dirRef.current = "LEFT";
						hasStartedRef.current = true;
					}
					break;
				case "ArrowRight":
				case "d":
				case "D":
					if (!hasStartedRef.current || dir !== "LEFT") nextDirRef.current = "RIGHT";
					if (gameState === "playing" && !hasStartedRef.current) {
						dirRef.current = "RIGHT";
						hasStartedRef.current = true;
					}
					break;
			}
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [gameState]);

	// ─── Touch controls ───────────────────────────────────────────────────────
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
			if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
				if (gameState === "playing") hasStartedRef.current = true;
			}
			if (Math.abs(dx) > Math.abs(dy)) {
				if (dx > 0 && (!hasStartedRef.current || dir !== "LEFT")) nextDirRef.current = "RIGHT";
				else if (dx < 0 && (!hasStartedRef.current || dir !== "RIGHT")) nextDirRef.current = "LEFT";
			} else {
				if (dy > 0 && (!hasStartedRef.current || dir !== "UP")) nextDirRef.current = "DOWN";
				else if (dy < 0 && (!hasStartedRef.current || dir !== "DOWN")) nextDirRef.current = "UP";
			}

			if (gameState === "playing" && !hasStartedRef.current) {
				dirRef.current = nextDirRef.current;
				hasStartedRef.current = true;
			}
		};
		window.addEventListener("touchstart", handleTouchStart);
		window.addEventListener("touchend", handleTouchEnd);
		return () => {
			window.removeEventListener("touchstart", handleTouchStart);
			window.removeEventListener("touchend", handleTouchEnd);
		};
	}, [gameState]);

	// ─── Save score on game over ──────────────────────────────────────────────
	useEffect(() => {
		if (gameState !== "over" || scoreSaved) return;
		setScoreSaved(true);
		const body = isGuest
			? { score: finalScore, difficulty, theme, is_guest: true, guest_name: guestName || undefined }
			: { score: finalScore, difficulty, theme };
		fetch("/api/scores/save", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}).catch(console.error);
	}, [gameState, scoreSaved, isGuest, guestName, finalScore, difficulty, theme]);

	// ─── Start / Restart ─────────────────────────────────────────────────────
	const startGame = useCallback((selectedOpt?: Biome | "RANDOM") => {
		const cols = getGridSize();
		const rows = cols;
		const spawnX = Math.floor(cols / 2);
		const spawnY = Math.floor(rows / 2);

		colsRef.current = cols;
		rowsRef.current = rows;

		// Pick biome
		const biome = (selectedOpt && selectedOpt !== "RANDOM")
			? selectedOpt
			: BIOMES[Math.floor(Math.random() * BIOMES.length)];
		biomeRef.current = biome;
		setActiveBiome(biome);

		// Generate map
		const { grid, meta } = generateMap(biome, cols, rows, spawnX, spawnY);
		gridRef.current = grid;
		gridMetaRef.current = meta;

		// Resize canvas
		const canvas = canvasRef.current;
		if (canvas) {
			canvas.width = cols * TILE_SIZE;
			canvas.height = rows * TILE_SIZE;
		}

		// Reset snake
		snakeRef.current = [{ x: spawnX, y: spawnY }];
		dirRef.current = "RIGHT";
		nextDirRef.current = "RIGHT";
		hasStartedRef.current = false;
		scoreRef.current = 0;
		gameOverRef.current = false;
		lastTickRef.current = 0;
		biomeTickCountRef.current = 0;

		// Reset camera
		cameraRef.current = { x: 0, y: 0 };
		if (canvasWrapRef.current) {
			canvasWrapRef.current.style.width = `${cols * TILE_SIZE}px`;
			canvasWrapRef.current.style.height = `${cols * TILE_SIZE}px`;
			canvasWrapRef.current.style.transform = "translate3d(0,0,0)";
		}
		if (viewportRef.current) {
			viewportRef.current.style.width = `${cols * TILE_SIZE}px`;
			viewportRef.current.style.height = `${cols * TILE_SIZE}px`;
		}

		// Reset scoring state
		multiplierRef.current = 1;
		setDisplayMultiplier(1);
		if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
		if (speedBoostTimerRef.current) clearTimeout(speedBoostTimerRef.current);
		if (iceSlideTimerRef.current) clearTimeout(iceSlideTimerRef.current);
		speedBoostRef.current = false;
		iceSlideRef.current = false;

		// Apple reset
		activeApplesRef.current = [];
		if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
		spawnAppleImmediately([{ x: spawnX, y: spawnY }]);

		setScore(0);
		setScoreSaved(false);
		setGameState("playing");
		scheduleNextSpawn();
	}, [getGridSize, spawnAppleImmediately, setScore, scheduleNextSpawn]);

	// ─── Draw idle screen ─────────────────────────────────────────────────────
	useEffect(() => {
		if (gameState !== "idle") return;
		// Set up a default canvas for idle state
		const cols = getGridSize();
		colsRef.current = cols;
		rowsRef.current = cols;
		const canvas = canvasRef.current;
		if (canvas) {
			canvas.width = cols * TILE_SIZE;
			canvas.height = cols * TILE_SIZE;
		}
		const ctx = canvas?.getContext("2d");
		if (viewportRef.current) {
			viewportRef.current.style.width = `${cols * TILE_SIZE}px`;
			viewportRef.current.style.height = `${cols * TILE_SIZE}px`;
		}
		if (!ctx) return;
		draw(ctx);
	}, [gameState, draw, getGridSize]);

	// ─── Biome badge colors ───────────────────────────────────────────────────
	const BIOME_BADGE: Record<Biome, string> = {
		GRASSLAND: "#214217",
		ICELAND: "#124373",
		DEEP_SEA: "#0a2254",
		VOLCANO: "#5e1d0d",
	};

	return (
		<div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-8">
			{/* Shared column: HUD + viewport share the same width */}
			<div className="inline-flex flex-col items-stretch" style={{ maxWidth: "95vw" }}>
				{/* HUD */}
				<div className="w-full mb-3 flex items-center justify-between bg-hud-bg backdrop-blur-sm border-2 border-card-border px-4 py-2 font-pixel flex-wrap gap-2">
					<div className="flex items-center gap-2 text-[0.65rem] text-muted">
						SCORE: <span className="text-accent">{score}</span>
						{displayMultiplier > 1 && (
							<span
								className="text-[0.5rem] px-1 py-0.5 animate-combo-pop"
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

					{/* Biome badge */}
					{gameState === "playing" && (
						<div
							className="text-[0.5rem] font-pixel px-2 py-1"
							style={{
								background: BIOME_BADGE[activeBiome],
								border: `1px solid ${BIOME_COLORS[activeBiome].badgeText}`,
								color: BIOME_COLORS[activeBiome].badgeText,
							}}
						>
							{BIOME_LABELS[activeBiome]}
						</div>
					)}

					<div className="text-[0.65rem] text-muted">
						BEST: <span className="text-fruit">{Math.max(highScore, globalBest || 0)}</span>
					</div>
					<button
						id="quit-btn"
						onClick={() => router.push("/")}
						className="text-[0.6rem] text-muted hover:text-fruit transition-colors"
					>
						✕ QUIT
					</button>
				</div>

				{/* Viewport — bounded window */}
				<div
					ref={viewportRef}
					className="relative pixel-card p-0 transition-all duration-300"
					style={{
						maxWidth: "95vw",
						maxHeight: "75vh",
						overflow: "hidden",
					}}
				>
					{/* Camera wrapper */}
					<div
						ref={canvasWrapRef}
						className="absolute top-0 left-0"
						style={{
							willChange: "transform",
							// width and height set dynamically on game start to match canvas
						}}
					>
						<canvas ref={canvasRef} className="block" />
					</div>

					{/* Idle overlay */}
					{gameState === "idle" && (
						<div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
							<p className="text-accent text-[0.6rem] font-pixel mb-4 animate-glow">READY?</p>
							<button
								id="play-btn"
								onClick={() => setGameState("selecting_biome")}
								className="pixel-btn bg-btn-primary text-background border-btn-primary-hover hover:bg-btn-primary-hover"
							>
								▶ PLAY
							</button>
							<p className="text-muted text-[0.4rem] mt-3">or press SPACE / ENTER</p>
						</div>
					)}

					{/* Biome Selection Overlay */}
					{gameState === "selecting_biome" && (
						<div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md">
							<p className="text-accent text-[0.7rem] font-pixel mb-5 animate-pulse">CHOOSE BIOME</p>
							<div className="grid grid-cols-2 gap-3 mb-4 w-[60%] min-w-[200px]">
								{BIOMES.map((b) => (
									<button
										key={b}
										onClick={() => startGame(b)}
										className="pixel-btn text-[0.5rem] py-2 px-1 flex items-center justify-center border-2 hover:brightness-110 active:scale-95 transition-all text-shadow-sm whitespace-nowrap"
										style={{
											backgroundColor: BIOME_COLORS[b].bg,
											borderColor: BIOME_COLORS[b].badgeText,
											color: BIOME_COLORS[b].badgeText
										}}
									>
										{BIOME_LABELS[b]}
									</button>
								))}
							</div>
							<button
								onClick={() => startGame("RANDOM")}
								className="pixel-btn bg-btn-primary text-background text-[0.55rem] border-btn-primary-hover hover:bg-btn-primary-hover w-[60%] min-w-[200px] py-3"
							>
								❓ RANDOM
							</button>
							<button
								onClick={() => setGameState("idle")}
								className="mt-4 text-[0.4rem] text-muted hover:text-accent font-pixel underline underline-offset-4"
							>
								BACK
							</button>
						</div>
					)}

					{/* Game over overlay */}
					{gameState === "over" && (
						<div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm">
							<p className="text-fruit text-[0.7rem] font-pixel mb-2 animate-blink">GAME OVER</p>
							<p className="text-accent text-[0.55rem] font-pixel mb-1">SCORE: {finalScore}</p>
							<p
								className="text-[0.4rem] font-pixel mb-6"
								style={{ color: BIOME_COLORS[activeBiome].badgeText }}
							>
								{BIOME_LABELS[activeBiome]}
							</p>
							<div className="flex gap-3">
								<button
									id="retry-btn"
									onClick={() => setGameState("selecting_biome")}
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
				<p className="text-[0.55rem] text-muted/50 mt-4 text-center tracking-wider">
					WASD / ARROW KEYS / SWIPE TO MOVE
				</p>

				{/* Biome legend */}
				{gameState === "playing" && (
					<div className="flex gap-4 mt-2 text-[0.55rem] font-pixel flex-wrap justify-center">
						{activeBiome === "GRASSLAND" && (
							<>
								<span style={{ color: BIOME_COLORS.GRASSLAND.special }}>■ MOUNTAIN = WALL</span>
							</>
						)}
						{activeBiome === "ICELAND" && (
							<>
								<span style={{ color: BIOME_COLORS.ICELAND.hazard }}>■ ICE = SLIDE</span>
							</>
						)}
						{activeBiome === "DEEP_SEA" && (
							<>
								<span style={{ color: BIOME_COLORS.DEEP_SEA.hazard }}>■ DEEP SEA = LETHAL</span>
							</>
						)}
						{activeBiome === "VOLCANO" && (
							<>
								<span style={{ color: BIOME_COLORS.VOLCANO.special }}>■ VENT</span>
								<span style={{ color: BIOME_COLORS.VOLCANO.hazard }}>■ LAVA = LETHAL</span>
							</>
						)}
					</div>
				)}

				{/* Apple legend */}
				{SCORING_CONFIG.specialApplesEnabled && (
					<div className="flex gap-4 mt-1 justify-center text-[0.55rem] text-muted/60 font-pixel">
						<span>
							<span style={{ color: "#FFD700" }}>■</span> GOLDEN = 5×
						</span>
						<span>
							<span style={{ color: "#8B00FF" }}>■</span> POISON = −PTS
						</span>
					</div>
				)}
			</div>{/* end shared wrapper */}
		</div>
	);
}
