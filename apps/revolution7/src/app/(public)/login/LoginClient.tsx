"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

type Status = "boot" | "ready" | "submitting" | "error";

export default function LoginClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const nextPath = useMemo(() => {
        // supporto classico: /login?next=/dashboard
        const n = searchParams?.get("next");
        return n && n.startsWith("/") ? n : "/"; // default home (o /dashboard)
    }, [searchParams]);

    const [status, setStatus] = useState<Status>("boot");
    const [message, setMessage] = useState<string>("Carico il tuo ESG Hub…");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // 1) Boot: verifica env + sessione e NON restare mai bloccato
    useEffect(() => {
        (async () => {
            try {
                if (!supabase) {
                    setStatus("error");
                    setMessage(
                        "Configurazione mancante: controlla le ENV su Vercel (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)."
                    );
                    return;
                }

                // Debug utile: se vuoi, lasciarlo anche in prod non fa danni
                // console.log("LOGIN: mounted");

                const { data, error } = await supabase.auth.getSession();
                if (error) {
                    setStatus("error");
                    setMessage(error.message || "Errore nel recupero sessione.");
                    return;
                }

                if (data?.session) {
                    // già loggato → fuori dal login
                    router.replace(nextPath);
                    return;
                }

                // nessuna sessione → mostra form
                setStatus("ready");
                setMessage("");
            } catch (e: any) {
                setStatus("error");
                setMessage(e?.message || "Errore imprevisto in fase di avvio.");
            }
        })();
    }, [router, nextPath]);

    // 2) Submit login
    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!supabase) {
            setStatus("error");
            setMessage("Supabase non inizializzato (ENV mancanti).");
            return;
        }

        setStatus("submitting");
        setMessage("");

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setStatus("error");
            setMessage(error.message || "Credenziali non valide.");
            return;
        }

        // Conferma sessione (evita edge case di redirect prima del cookie)
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
            router.replace(nextPath);
            return;
        }

        // fallback: anche se getSession non vede subito, prova redirect
        router.replace(nextPath);
    }

    // UI
    if (status === "boot") {
        return (
            <div style={{ padding: 24 }}>
                <h1>Carico il tuo ESG Hub…</h1>
                <p style={{ opacity: 0.7, marginTop: 8 }}>Attendi un istante.</p>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div style={{ padding: 24, maxWidth: 520 }}>
                <h1>Accesso</h1>
                <p style={{ color: "crimson", marginTop: 10 }}>{message}</p>

                <div style={{ marginTop: 16 }}>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ padding: "10px 14px", cursor: "pointer" }}
                    >
                        Riprova
                    </button>
                </div>

                <p style={{ opacity: 0.6, marginTop: 14, fontSize: 12 }}>
                    Se continui a vedere questo errore, verifica su Vercel:
                    <br />
                    <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
                </p>
            </div>
        );
    }

    // ready / submitting
    return (
        <div style={{ padding: 24, maxWidth: 420 }}>
            <h1>Accedi</h1>

            <form
                onSubmit={onSubmit}
                style={{ display: "grid", gap: 12, marginTop: 12 }}
            >
                <input
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    style={{ padding: 10 }}
                />

                <input
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    style={{ padding: 10 }}
                />

                <button
                    disabled={status === "submitting"}
                    type="submit"
                    style={{ padding: "10px 14px", cursor: "pointer" }}
                >
                    {status === "submitting" ? "Accesso..." : "Entra"}
                </button>

                {message ? (
                    <p style={{ color: "crimson", margin: 0 }}>{message}</p>
                ) : null}
            </form>
        </div>
    );
}
