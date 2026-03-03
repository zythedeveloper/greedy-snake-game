# AI Agent Prompt: Secure Snake Game Auth

## 🎯 Objective 
Implement a professional authentication system using **Auth.js**. The system must support Google OAuth, Secure Email/Password login, and a "Play as Guest" fallback.

## 🛠️ Technical Stack & Security Requirements
* **Framework:** Auth.js (supporting Next.js, Express, or SvelteKit).
* **Encryption (Strict):** Use the **`bcrypt`** library to hash passwords.
    * **Rule:** The database **must only store hashed passwords**. Plain-text passwords must never be saved.
* **Providers:** * **GoogleProvider:** For Social OAuth login.
    * **CredentialsProvider:** For Email/Password login.
* **Session Management:** Use **JWT (JSON Web Tokens)** for secure session handling.
* **Database Schema:** * `User`: id, name, email, image, **passwordHash** (bcrypt), created_at.
    * `Score`: user_id (FK, nullable for guests), score, guest_name (nullable), timestamp.

## 📋 Specific Implementation Tasks

### 1. Secure Registration & Hashing
* Implement a signup flow that takes a password, hashes it using `bcrypt` (10-12 salt rounds), and saves only the hash to the `User` table.

### 2. Auth.js Configuration
* **CredentialsProvider:** Implement the `authorize` function to:
    1.  Fetch the user by email.
    2.  Compare the submitted password with the stored hash using `bcrypt.compare()`.
* **GoogleProvider:** Configure OAuth 2.0 with `clientId` and `clientSecret`.
* **Callbacks:** Ensure the `user.id` is passed into the session object for client-side access.

### 3. Frontend UI: The "Entry Gate"
* Replace the current ID prompt with a Login Modal containing:
    * **Primary Actions:** "Sign in with Google" and "Email/Password" login/signup fields.
    * **Guest Action:** A "Play as Guest" button.
* **Guest Logic:** If "Play as Guest" is chosen, allow the user to enter a temporary nickname or assign them a "Guest-123" ID. Do not create a database `User` record for guests.

### 4. Authenticated vs. Guest Score Submission
* **GameOver Logic:**
    * **Authenticated Users:** Automatically POST the score to `/api/scores/save`. The backend must verify the session using `auth()` and extract the `user_id` server-side (do not trust a `user_id` sent in the request body).
    * **Guest Users:** Send the score to the same endpoint with a `isGuest: true` flag and the temporary nickname. 
* **Validation:** Ensure the backend prevents guests from claiming "Authenticated" user slots in the database.

### 5. Leaderboard Update
* Update the scoreboard to display a mix of registered `names` and `guest_nicknames`.
* Visual Distinction: Add a small badge or icon next to registered users to differentiate them from guests.

## 📤 Expected Output
1.  **Auth Configuration:** `auth.ts` file with Bcrypt-integrated Credentials and Google providers.
2.  **Environment Template:** `.env.local` with `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `DATABASE_URL`.
3.  **Modified Game Component:** Updated frontend logic for the Login/Guest modal and the `onGameOver` fetch request.
4.  **API Routes:** Secure server-side code for handling score persistence for both users and guests.