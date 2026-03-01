from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from database import create_db_and_tables, get_session
from models import GameLog, GamePayload, LeaderboardEntry

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


@app.post("/api/save-game")
def save_game(payload: GamePayload, session: Session = Depends(get_session)):
    log = GameLog(
        user_id=payload.resolve_user_id(),
        score=payload.score,
        difficulty=payload.difficulty,
        theme=payload.theme,
    )
    session.add(log)
    session.commit()
    session.refresh(log)
    return {"status": "ok", "id": log.id, "user_id": log.user_id}


@app.get("/api/leaderboard", response_model=list[LeaderboardEntry])
def leaderboard(session: Session = Depends(get_session)):
    statement = select(GameLog).order_by(GameLog.score.desc()).limit(10)
    results = session.exec(statement).all()
    return results
