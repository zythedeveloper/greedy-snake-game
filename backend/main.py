from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from database import create_db_and_tables, get_session
from models import (
	User,
	GameLog,
	GamePayload,
	RegisterPayload,
	EmailLookupPayload,
	GoogleUpsertPayload,
	LeaderboardEntry,
)

app = FastAPI(title="Greedy Snake API")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
	create_db_and_tables()


# ── Auth helpers ──────────────────────────────────────────────────────────────

@app.post("/api/auth/register")
def register(payload: RegisterPayload, session: Session = Depends(get_session)):
	existing = session.exec(select(User).where(User.email == payload.email)).first()
	if existing:
		raise HTTPException(status_code=409, detail="Email already registered")
	user = User(name=payload.name, email=payload.email, password_hash=payload.password_hash)
	session.add(user)
	session.commit()
	session.refresh(user)
	return {"id": user.id, "email": user.email, "name": user.name}


@app.post("/api/auth/user-by-email")
def user_by_email(payload: EmailLookupPayload, session: Session = Depends(get_session)):
	user = session.exec(select(User).where(User.email == payload.email)).first()
	if not user:
		raise HTTPException(status_code=404, detail="User not found")
	return {
		"id": user.id,
		"email": user.email,
		"name": user.name,
		"image": user.image,
		"password_hash": user.password_hash,
	}


@app.post("/api/auth/google-upsert")
def google_upsert(payload: GoogleUpsertPayload, session: Session = Depends(get_session)):
	user = session.exec(select(User).where(User.email == payload.email)).first()
	if user:
		# Update image / name if provided
		if payload.name:
			user.name = payload.name
		if payload.image:
			user.image = payload.image
		session.add(user)
		session.commit()
		session.refresh(user)
	else:
		user = User(
			name=payload.name or payload.email.split("@")[0],
			email=payload.email,
			image=payload.image,
		)
		session.add(user)
		session.commit()
		session.refresh(user)
	return {"id": user.id, "email": user.email, "name": user.name}


# ── Game score ────────────────────────────────────────────────────────────────

@app.post("/api/save-game")
def save_game(payload: GamePayload, session: Session = Depends(get_session)):
	if payload.is_guest:
		log = GameLog(
			is_guest=True,
			guest_name=payload.guest_name,
			score=payload.score,
			difficulty=payload.difficulty,
			theme=payload.theme,
		)
	else:
		if payload.user_id is None:
			raise HTTPException(status_code=400, detail="user_id required for authenticated users")
		log = GameLog(
			user_id=payload.user_id,
			is_guest=False,
			score=payload.score,
			difficulty=payload.difficulty,
			theme=payload.theme,
		)
	session.add(log)
	session.commit()
	session.refresh(log)
	return {"status": "ok", "id": log.id}


# ── Leaderboard ───────────────────────────────────────────────────────────────

@app.get("/api/leaderboard", response_model=list[LeaderboardEntry])
def leaderboard(session: Session = Depends(get_session)):
	statement = select(GameLog).order_by(GameLog.score.desc()).limit(10)
	results = session.exec(statement).all()

	entries = []
	for row in results:
		if row.is_guest:
			display_name = row.guest_name or "Guest"
		else:
			user = session.get(User, row.user_id)
			display_name = user.name if user else "Unknown"
		entries.append(
			LeaderboardEntry(
				id=row.id,
				display_name=display_name,
				is_guest=row.is_guest,
				score=row.score,
				timestamp=row.timestamp,
				difficulty=row.difficulty,
			)
		)
	return entries
