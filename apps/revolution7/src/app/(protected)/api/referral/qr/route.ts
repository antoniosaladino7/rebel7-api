import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export async function GET() {
    const supabase = await createClient();
    if (!supabase) return new NextResponse("Supabase env missing", { status: 500 });

    return NextResponse.json({ ok: true });
}
