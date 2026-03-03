import { NextResponse } from "next/server";
import { auth } from "@auth";

const API_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(req: Request) {
    const body = await req.json();

    const session = await auth();

    // Determine if this is a guest or authenticated user
    const isGuest = !session?.user;

    let payload: Record<string, unknown>;

    if (isGuest) {
        // Guest: must provide isGuest flag and guest_name, cannot claim user_id
        payload = {
            is_guest: true,
            guest_name: body.guest_name || null,
            score: body.score,
            difficulty: body.difficulty || "normal",
            theme: body.theme || "dark",
        };
    } else {
        // Authenticated: ignore any user_id in body, use server-side session
        payload = {
            is_guest: false,
            user_id: session.user.id,
            score: body.score,
            difficulty: body.difficulty || "normal",
            theme: body.theme || "dark",
        };
    }

    // Forward to backend
    const res = await fetch(`${API_URL}/api/save-game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
        return NextResponse.json({ error: data.detail || "Failed to save score" }, { status: res.status });
    }

    return NextResponse.json({ ok: true, ...data });
}
