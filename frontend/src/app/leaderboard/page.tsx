"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface LeaderboardEntry {
    id: number;
    display_name: string;
    is_guest: boolean;
    score: number;
    timestamp: string;
    difficulty: string;
}

export default function LeaderboardPage() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch(`${API_URL}/api/leaderboard`)
            .then((r) => r.json())
            .then((data) => {
                setEntries(data);
                setLoading(false);
            })
            .catch((err) => {
                setError("Failed to load leaderboard");
                setLoading(false);
                console.error(err);
            });
    }, []);

    const formatDate = (ts: string) => {
        try {
            return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        } catch {
            return "—";
        }
    };

    const rankEmojis = ["👑", "🥈", "🥉"];

    return (
        <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center px-4 py-10">
            {/* Header */}
            <div className="text-center mb-8">
                <span className="text-3xl mb-2 block">🏆</span>
                <h1 className="text-accent text-lg font-pixel animate-glow">LEADERBOARD</h1>
                <p className="text-muted text-[0.4rem] mt-2 tracking-widest">TOP 10 PLAYERS</p>
            </div>

            {/* Table Card */}
            <div className="pixel-card w-full max-w-lg overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <span className="text-accent text-[0.5rem] font-pixel animate-blink">LOADING...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <span className="text-fruit text-[0.5rem] font-pixel">{error}</span>
                        <button onClick={() => window.location.reload()}
                            className="text-[0.45rem] text-muted hover:text-accent mt-4 font-pixel transition-colors">
                            ↻ RETRY
                        </button>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <span className="text-2xl mb-3">🐍</span>
                        <span className="text-muted text-[0.5rem] font-pixel">NO SCORES YET</span>
                        <Link href="/game" className="text-[0.45rem] text-accent mt-4 font-pixel hover:underline">
                            ▶ BE THE FIRST
                        </Link>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-table-border">
                                <th className="text-[0.4rem] text-muted font-pixel py-3 px-3 text-left w-12">#</th>
                                <th className="text-[0.4rem] text-muted font-pixel py-3 px-3 text-left">PLAYER</th>
                                <th className="text-[0.4rem] text-muted font-pixel py-3 px-3 text-right">SCORE</th>
                                <th className="text-[0.4rem] text-muted font-pixel py-3 px-3 text-right hidden sm:table-cell">DATE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry, i) => (
                                <tr
                                    key={entry.id}
                                    className={`border-b border-table-border transition-colors hover:bg-accent/5
                    ${i % 2 === 1 ? "bg-table-row-alt" : ""}
                    ${i === 0 ? "bg-accent/5" : ""}`}
                                >
                                    <td className="text-[0.45rem] font-pixel py-3 px-3">
                                        {rankEmojis[i] || <span className="text-muted">{i + 1}</span>}
                                    </td>
                                    <td className="text-[0.45rem] font-pixel py-3 px-3 text-foreground">
                                        <span className="truncate max-w-[100px] inline-block align-middle">
                                            {entry.display_name}
                                        </span>
                                        {entry.is_guest ? (
                                            <span className="ml-1.5 inline-block align-middle text-[0.35rem] bg-muted/20 text-muted px-1 py-0.5 rounded font-pixel border border-muted/30">
                                                GUEST
                                            </span>
                                        ) : (
                                            <span className="ml-1.5 inline-block align-middle text-[0.35rem] bg-accent/20 text-accent px-1 py-0.5 rounded font-pixel border border-accent/30">
                                                ★
                                            </span>
                                        )}
                                    </td>
                                    <td className="text-[0.5rem] font-pixel py-3 px-3 text-right text-accent">
                                        {entry.score.toLocaleString()}
                                    </td>
                                    <td className="text-[0.4rem] font-pixel py-3 px-3 text-right text-muted hidden sm:table-cell">
                                        {formatDate(entry.timestamp)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-4 mt-8">
                <Link href="/game"
                    className="pixel-btn bg-btn-primary text-background border-btn-primary-hover hover:bg-btn-primary-hover">
                    🎮 PLAY
                </Link>
                <Link href="/"
                    className="pixel-btn bg-transparent text-muted border-card-border hover:text-accent hover:border-accent">
                    🏠 HOME
                </Link>
            </div>
        </div>
    );
}
