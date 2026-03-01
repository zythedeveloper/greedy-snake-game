import random
import string
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel
from sqlmodel import Field, SQLModel


class GameLog(SQLModel, table=True):
    __tablename__ = "game_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    score: int
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    difficulty: str = Field(default="normal")
    theme: str = Field(default="dark")


class GamePayload(BaseModel):
    user_id: Optional[str] = None
    score: int
    difficulty: str = "normal"
    theme: str = "dark"

    def resolve_user_id(self) -> str:
        if not self.user_id or self.user_id.strip() == "":
            suffix = "".join(random.choices(string.digits, k=4))
            return f"Guest_{suffix}"
        return self.user_id.strip()


# Leaderboard response item
class LeaderboardEntry(BaseModel):
    id: int
    user_id: str
    score: int
    timestamp: str
    difficulty: str
    theme: str
