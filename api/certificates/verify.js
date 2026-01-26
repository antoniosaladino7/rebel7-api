// API CONTRACT FROZEN v1.0 – DO NOT CHANGE WITHOUT VERSIONING.
const { createClient } = require("@supabase/supabase-js");

function setCors(req, res) {
    const origin = req.headers.origin || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
}

function adminSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        const err = new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
        err.code = "ENV_MISSING";
        err.missing = {
            SUPABASE_URL: !url,
            SUPABASE_SERVICE_ROLE_KEY: !key,
        };
        throw err;
    }

    return createClient(url, key, { auth: { persistSession: false } });
}

module.exports = async function handler(req, res) {
    setCors(req, res);

    // Preflight
    if (req.method === "OPTIONS") return res.status(204).end();

    try {
        const code = String(req.query.certificate_code || "").trim();

        if (!code) {
            return res.status(400).json({
                ok: false,
                error: "Missing certificate_code",
                code: "BAD_REQUEST",
            });
        }

        const supabase = adminSupabase();

        const { data, error } = await supabase
            .from("esg_certificates")
            .select("*")
            .eq("certificate_code", code)
            .maybeSingle();

        if (error) {
            return res.status(500).json({
                ok: false,
                error: "Database error",
                code: "DB_ERROR",
                details: error.message,
            });
        }

        if (!data) {
            return res.status(404).json({
                ok: false,
                error: "Certificate not found",
                code: "CERT_NOT_FOUND",
            });
        }

        return res.status(200).json({
            ok: true,
            certificate: {
                certificate_code: data.certificate_code,
                status: data.status,
                level: data.level,
                issued_at: data.issued_at,
                valid_to: data.valid_to ?? data.valid_until ?? null,
                company: data.company ?? {
                    name: data.organization_name ?? null,
                    vat: null,
                    country: null,
                },
                issuer: {
                    name: data.issuer_name ?? "Rebel7 ESG Core Engine",
                },
                audit: {
                    hash: data.audit?.hash ?? data.audit_hash ?? null,
                    verified_at: new Date().toISOString(),
                },
            },
        });
    } catch (e) {
        const code = e?.code || "INTERNAL_ERROR";
        const payload = {
            ok: false,
            error: "Internal error",
            code,
            details: e?.message ?? String(e),
        };

        if (code === "ENV_MISSING" && e?.missing) payload.missing = e.missing;

        return res.status(500).json(payload);
    }
};
