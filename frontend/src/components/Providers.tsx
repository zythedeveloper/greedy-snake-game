"use client";

import { SessionProvider } from "next-auth/react";
import { AppProvider } from "@/context/AppContext";
import SessionSync from "./SessionSync";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AppProvider>
                <SessionSync />
                {children}
            </AppProvider>
        </SessionProvider>
    );
}
