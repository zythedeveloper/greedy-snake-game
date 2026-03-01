# Greedy Snake

A full-stack, retro pixel-style "Greedy Snake" game.

## Directory Structure

- **/frontend**: Contains the Next.js application, including the UI, game logic, theming (light/dark mode), and API integration.
- **/backend**: Contains the FastAPI application and SQLite database handling user authentication, scores, and leaderboards.

## Prerequisites

Ensure you have the following installed before proceeding:
- **Node.js**: Recommended (LTS version) configured with `npm`.
- **Python**: 3.10+ recommended.
- **Conda** (or Miniconda): For virtual environment management.
- **uv**: The default Python package manager for this project.

## Installation

### 1. Backend Dependencies

Set up the Python environment and install the required packages using `uv`:

```bash
# Create and activate the conda environment (if not already created)
conda create -n greedy-snake python=3.10.19 -y
conda activate greedy-snake

# Navigate to the backend directory
cd backend

# Install dependencies using uv (if pyproject.toml or similar exists)
pip install uv
uv python pin 3.10.19
uv sync
```

### 2. Frontend Dependencies

Install the necessary Node.js packages:

```bash
# Navigate to the frontend directory from the project root
cd frontend

# Install packages
npm install
```

## Running the Application

I have set up a root `package.json` that uses `concurrently` to run both the frontend and backend in one single terminal window! 

To use this simplified method:

1. **Install root dependencies:** (You just do this once)
   ```bash
   npm install
   ```

2. **Run both servers simultaneously:**
   ```bash
   conda activate greedy-snake
   npm run dev
   ```

This will automatically spin up the Next.js frontend on `http://localhost:3000` and the FastAPI backend on `http://localhost:8000` via `uvicorn` within your active `greedy-snake` conda environment.
