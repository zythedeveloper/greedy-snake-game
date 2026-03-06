# Task: Implement Biome-Based Procedural Map Generation

**Context:** The "Greedy Snake" game is transitioning from a static grid to a multi-environment journey. Instead of random stone clutter, the game will generate one of four unique biomes per session, each with its own interactive logic, environmental hazards, and dynamic color palettes.

---

### Phase 1: Environment-Aware Grid System
The grid now stores both the **Tile Type** and the **Active Biome**.
1.  **Dynamic Grid Sizing:**
    * **Easy:** 20x20 units.
    * **Medium:** 30x30 units.
    * **Hard:** 50x50 units.
2.  **Biome Definitions:** `GRASSLAND`, `ICELAND`, `DEEP_SEA`, and `VOLCANO`.
3.  **Tile "Types":**
    * `0 = Clear`.
    * `1 = Biome Hazard`.
    * `2 = Portal`.
    * `3 = Special (e.g., Mountain/Lava/Bubble)`.
4.  **Collision Refactor:** Modify the `checkCollision()` function to reference `gridData` for specific biome interactions before calculating the next frame.

---

### Phase 2: Biome-Specific Procedural Generation
Instead of uniform noise, the `generateMap()` function selects a biome and applies its specific structural logic:

1.  **Grassland (The Open Range):** Generates **Multiblock Mountains** (2x2 or 3x3 blocks) that act as large, clearly visible obstacles.
2.  **Iceland (The Slip-Stream):** Generates large "Ice Sheets" that affect movement physics.
3.  **Deep Sea (The Current):** Generates "Bubble Streams" that provide directional force.
4.  **Volcano (The Flow):** Places "Volcano Vents" that dynamically spread lava to adjacent tiles.

---

### Phase 3: Special Environmental Logic & Interaction
Static walls and stones are removed in favor of these interactive environmental effects:

| Biome | Unique Tile | Behavior Logic | Interaction |
| :--- | :--- | :--- | :--- |
| **Grassland** | **Mountain** | Large multiblock obstacle. | Collision = **Game Over**. |
| **Iceland** | **Frozen Rift** | Low friction surface. | **Sudden Speed Boost** (Snake slides extra tiles). |
| **Deep Sea** | **Bubble Jet** | Directional current. | **Pushes** the snake 1 tile in the jet's direction. |
| **Volcano** | **Lava Flow** | **Dynamic Hazard**. | Volcano tiles spread "Lava" to nearby tiles every few ticks. |

---

### Phase 4: Map Validation & Hazard Rules
To ensure playability despite dynamic hazards, the algorithm follows these constraints:

1. **Lava Management:** "Lava" tiles must eventually "Cool Down" (disappear) after a set duration to prevent the map from becoming fully blocked.
2. **Spawn Protection:** Maintain a 5x5 'Safe Zone' of empty tiles around the snake's starting coordinates.
3. **Connectivity Check (Flood Fill):** After generation, perform a check to ensure at least 80% of the grid is reachable.
4. **Pathing Guarantee:** Ensure a clear path exists between the snake and the first apple spawn point.

---

### Phase 5: Dynamic Scaling & Canvas Logic
To handle larger maps without losing visual clarity, the game DOM scales based on grid count.

1. **Constant Tile Size:** Enforce a fixed size (e.g., `TILE_SIZE = 20px`) so snake segments and hazards remain a consistent size regardless of the map's total dimensions.
2. **Dynamic Canvas Sizing:** Recalculate the canvas dimensions at the start of each game:
   * `canvas.width = gridWidth * TILE_SIZE`.
   * `canvas.height = gridHeight * TILE_SIZE`.

---

### Phase 6: Responsive UI & Viewport
Since a 50x50 grid results in a canvas too large for most screens, the game uses a windowed UI.

1. **Bounded Viewport:** The game container applies CSS bounding logic (`max-width: 95vw` and `max-height: 85vh`) with `overflow: hidden` to act as a masked window.
2. **Perfect Centering:** Use Flexbox or CSS Grid to keep the game area centered within the browser viewport.

---

### Phase 7: Viewport & Camera Follow System
Implement a "Camera" that tracks the snake's head to navigate the large world.

1. **Dynamic Camera Tracking:** As the snake moves, use CSS `transform: translate3d()` to shift the large underlying canvas relative to the container.
2. **Camera Math:**
   $$Offset_X = (Snake_{HeadX} \times TILE\_SIZE) - (\text{ViewportWidth} / 2)$$
   $$Offset_Y = (Snake_{HeadY} \times TILE\_SIZE) - (\text{ViewportHeight} / 2)$$
3. **Boundary Clamping:** The camera stops scrolling when it reaches the edge of the world coordinates to prevent showing the area outside the map.



---

### Technical Requirements:
* **Biome-Based Color Palettes:** The renderer must update the `baseTileColor` and `hazardColor` dynamically upon biome selection:
    * **Grassland:** Light Green base / Dark Green mountains.
    * **Iceland:** Pale Blue base / White frozen rifts.
    * **Deep Sea:** Navy Blue base / Cyan bubble jets.
    * **Volcano:** Dark Gray base / Glowing Orange lava.
* **Biome Tick System:** Implement a loop that specifically handles time-based events like Lava spreading or cooling.
* **Reset Logic:** Ensure the entire map, biome selection, base colors, DOM dimensions, and camera offsets are reset when starting a new game.