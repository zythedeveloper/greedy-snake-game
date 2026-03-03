# Task: Implement Advanced Scoring, FIFO Apple Decay, and Multi-Apple Logic

**Context:** I am refactoring my "Greedy Snake" game. I want to transition the game from a static loop to a dynamic, time-pressured arcade experience using a FIFO (First-In, First-Out) apple management system and tiered scoring.

---

### Phase 1: Tiered Difficulty Scaling
Modify the collision logic to check the current game mode. Points awarded per apple:
- **Easy Mode:** +1 point
- **Medium Mode:** +3 points
- **Hard Mode:** +5 points

---

### Phase 2: FIFO Apple Decay & Spawning (Core Logic)
Transition the game to a **Multiple Apple Queue** with the following rules:
1. **FIFO Queue:** Store apples in an array. Manage the array using First-In, First-Out principles (Oldest out, Newest in).
2. **5-Second Lifespan:** Each apple has exactly **5 seconds** to be eaten. 
3. **Decay & Replace:** When an apple’s 5-second timer expires:
   - Remove the **oldest** apple from the array (index 0).
   - Immediately spawn a **new** apple at a random location and push it to the end of the array.
4. **Dynamic Interval:** In addition to decay-replacement, implement a random spawn trigger every **2 to 4 seconds** (up to a maximum cap of 5 apples on the board).

---

### Phase 3: Advanced Scoring Enhancements
Please implement modular functions for the following:
1. **Combo Multiplier:** Eating multiple apples within a 5-second window increases a `multiplier` (x2, x3...). Reset to x1 if the timer expires.
2. **Time-Decay Bonus:** Add a small bonus for apples eaten quickly after they spawn (e.g., +2 points if eaten in the first 2 seconds).
3. **Special Apple Variety:**
   - **Golden (5% Chance):** 5x the base points of the current mode or shrinks the snake tail.
   - **Poison (15% Chance):** Deducts points or temporarily increases game speed.
4. **Length-Based Scaling:** `Final Points = (Base Mode Points) + (Current Snake Length)`.

---

### Technical Requirements:
* **Timer Management:** Use `setTimeout` or a timestamp-based check within the game loop to track the 5-second lifespan of each individual apple object.
* **Array Manipulation:** Use `.shift()` to remove the oldest apple on decay and `.push()` to add new ones.
* **Collision Logic:** The game loop must iterate through the apple array every frame to check for head-to-apple collisions.
* **UI Updates:** The score display and the active multiplier should update in real-time.