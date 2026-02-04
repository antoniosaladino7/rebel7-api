export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabaseServer";

export default async function SfidePage() {
    const supabase = await createClient();
    if (!supabase) return <div>Configurazione Supabase mancante</div>;

    return <div>Sfide</div>;
}
