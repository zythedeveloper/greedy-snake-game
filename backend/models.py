import random
import string
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel
from sqlmodel import Field, SQLModel


# ── User table ───────────────────────────────────────────────────────────────
class User(SQLModel, table=True):
	__tablename__ = "users"

	id: Optional[int] = Field(default=None, primary_key=True)
	name: str
	email: str = Field(unique=True, index=True)
	image: Optional[str] = None
	password_hash: Optional[str] = None  # None for OAuth users
	created_at: str = Field(
		default_factory=lambda: datetime.now(timezone.utc).isoformat()
	)


# ── Game log (supports both auth users and guests) ───────────────────────────
class GameLog(SQLModel, table=True):
	__tablename__ = "game_logs"

	id: Optional[int] = Field(default=None, primary_key=True)
	# Authenticated users: user_id set to DB user id; guests: NULL
	user_id: Optional[int] = Field(default=None, foreign_key="users.id", index=True)
	guest_name: Optional[str] = Field(default=None)
	is_guest: bool = Field(default=False)
	score: int
	timestamp: str = Field(
		default_factory=lambda: datetime.now(timezone.utc).isoformat()
	)
	difficulty: str = Field(default="normal")
	theme: str = Field(default="dark")


# ── Request / Response schemas ────────────────────────────────────────────────
class GamePayload(BaseModel):
	is_guest: bool = False
	user_id: Optional[int] = None
	guest_name: Optional[str] = None
	score: int
	difficulty: str = "normal"
	theme: str = "dark"


class RegisterPayload(BaseModel):
	name: str
	email: str
	password_hash: str  # already hashed by Next.js API route


class EmailLookupPayload(BaseModel):
	email: str


class GoogleUpsertPayload(BaseModel):
	email: str
	name: Optional[str] = None
	image: Optional[str] = None


class LeaderboardEntry(BaseModel):
	id: int
	display_name: str   # user name or guest_name
	is_guest: bool
	score: int
	timestamp: str
	difficulty: str
