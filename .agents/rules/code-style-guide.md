---
trigger: always_on
---

General Development Guide

The default frontend package manager is `npm`.
- Install dependencies: `npm install <package_name>` to add a package, or simply `npm install` to install from an existing package.json.
- Run development scripts: `npm run <script_name>` (e.g., `npm run dev` or `npm run build`) to execute defined tasks.

The default python package manager is `uv`.
- Install any python package: uv add <package_name>, if error then `uv pip install <package_name>`.
- Execute any python script: `uv run python <script_name>`.

The default virtual environment is `conda`.
- Activate environment: `conda activate <environment_name>`.
- I have created an environment called `greedy-snake` for you to use.