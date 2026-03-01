# Project: Retro Pixel-Style Full-Stack "Greedy Snake" App

**Role:** Expert Full-Stack Developer (FastAPI + Next.js Specialist).
**Goal:** Build a retro, multi-page Greedy Snake game featuring a login system, Guest Mode, Leaderboard, and dynamic Theme Toggling (Light/Dark).

### 1. Project Architecture (Next.js + Tailwind CSS)
Implement a multi-page app with the following routes:
* **`/` (Landing Page):** * Retro "Greedy Snake" hero title.
    * Auth Card: Input for `user_id`, "Start Game" button, and "Play as Guest" button.
    * Navigation to Leaderboard and Settings.
* **`/game` (Game Page):** * HTML5 Canvas game engine.
    * HUD (Heads-Up Display): Real-time Score, High Score, and a "Quit" button.
    * Logic: On "Game Over," trigger a `POST` request to the backend with `user_id`, `score`, `login_timestamp`, and `theme_used`.
* **`/leaderboard` (Leaderboard Page):** * Fetch and display the Top 10 scores from the FastAPI backend in an 8-bit styled table.
* **`/settings` (Settings Page):** * Theme Toggle (Switch between Light/Dark mode).
    * Difficulty Selector (Adjusts snake movement speed).

### 2. Backend (FastAPI + SQLite)
* **Database:** SQLite via SQLAlchemy/SQLModel.
    * **Table `game_logs`:** `id`, `user_id`, `score`, `timestamp`, `difficulty`, `theme`.
* **API Endpoints:**
    * `POST /api/save-game`: Receives and validates final game data.
    * `GET /api/leaderboard`: Returns top 10 scores sorted by highest value.
* **Guest Logic:** If no `user_id` is provided, generate a "Guest_XXXX" string.

### 3. Visuals & Theme Engine
* **8-Bit Aesthetic:** Use the 'Press Start 2P' font and `image-rendering: pixelated` for the Canvas.
* **Dynamic Theme Support:** Use Tailwind's `dark` mode. The Canvas `ctx.fillStyle` colors must update based on the current theme:
    * **Dark Mode:** Bg: #121212, Snake: #39FF14 (Neon), Fruit: #FF3131.
    * **Light Mode:** Bg: #F5F5F5, Snake: #2D5A27 (Forest), Fruit: #D32F2F.

### 4. Technical Requirements
* **State Management:** Use `localStorage` or React Context to persist `user_id` and `theme` across all pages.
* **Game Loop:** Use `requestAnimationFrame` for 60fps smoothness.
* **Integration:** Use `fetch` or `axios` for frontend-backend communication.