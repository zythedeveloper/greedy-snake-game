"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useApp } from "@/context/AppContext";

/**
 * Invisible component that syncs the Auth.js session into AppContext.
 * Placed inside AppProvider so it can call useApp().
 */
export default function SessionSync() {
    const { data: session, status } = useSession();
    const { setUserProfile, clearSession, userProfile } = useApp();

    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            const u = session.user;
            // Only update if something actually changed to avoid re-render loops
            if (!userProfile || userProfile.id !== u.id) {
                setUserProfile({
                    id: u.id ?? u.email ?? "",
                    name: u.name ?? u.email ?? "Player",
                    email: u.email ?? "",
                    image: u.image,
                });
            }
        } else if (status === "unauthenticated") {
            // Don't clear if in guest mode — that's separate state
            if (userProfile) {
                clearSession();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, session]);

    return null;
}
