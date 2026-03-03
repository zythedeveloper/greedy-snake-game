import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const API_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(req: Request) {
	try {
		const { name, email, password } = await req.json();

		if (!email || !password) {
			return NextResponse.json(
				{ error: "Email and password required" },
				{ status: 400 },
			);
		}

		if (password.length < 6) {
			return NextResponse.json(
				{ error: "Password must be at least 6 characters" },
				{ status: 400 },
			);
		}

		// Hash with 12 rounds server-side — plain-text password never leaves this function
		const password_hash = await bcrypt.hash(password, 12);

		let res: Response;
		try {
			res = await fetch(`${API_URL}/api/auth/register`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: (name || "").trim() || email.split("@")[0],
					email,
					password_hash,
				}),
			});
		} catch {
			return NextResponse.json(
				{ error: "Cannot reach game server. Is the backend running?" },
				{ status: 503 },
			);
		}

		const text = await res.text();

		let data: Record<string, unknown> = {};
		try {
			data = JSON.parse(text);
		} catch {
			return NextResponse.json(
				{
					error: `Backend returned unexpected response (${res.status})`,
				},
				{ status: 502 },
			);
		}

		if (!res.ok) {
			return NextResponse.json(
				{ error: (data.detail as string) || "Registration failed" },
				{ status: res.status },
			);
		}

		return NextResponse.json({
			ok: true,
			user: { id: data.id, email: data.email, name: data.name },
		});
	} catch (err) {
		console.error("[/api/register] unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
