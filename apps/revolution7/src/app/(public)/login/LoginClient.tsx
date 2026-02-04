"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

export default function LoginClient() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!supabase) {
            setLoading(false);
            setError("Configurazione Supabase mancante (env NEXT_PUBLIC_*).");
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);

        if (error) return setError(error.message);
        router.push("/sfide");
    }

    return (
        <div style={{ padding: 24 }}>
            <h1>Accedi</h1>
            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
                <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                <button disabled={loading} type="submit">{loading ? "Accesso..." : "Entra"}</button>
                {error && <p style={{ color: "crimson" }}>{error}</p>}
            </form>
        </div>
    );
}
