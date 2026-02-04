import { createClient } from "@/lib/supabaseServer";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    if (!supabase) return <div>Configurazione Supabase mancante</div>;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return <div>Non autorizzato</div>;

    return <>{children}</>;
}
