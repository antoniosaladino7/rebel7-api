const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

function json(res, status, body) {
    res.status(status).setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    return res.end(JSON.stringify(body));
}

function getEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

function safeString(v) {
    if (v === undefined || v === null) return "";
    return String(v).trim();
}

function parseJsonBody(req) {
    // Vercel spesso ti dà req.body già come oggetto, ma a volte è stringa.
    if (!req.body) return null;
    if (typeof req.body === "object") return req.body;
    try { return JSON.parse(req.body); } catch { return null; }
}

function makeCode() {
    // codice leggibile + unico: R7-ESG-YYYY-XXXXXX (random)
    const year = new Date().getUTCFullYear();
    const rnd = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars
    return `R7-ESG-${year}-${rnd}`;
}

module.exports = async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return json(res, 405, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
        }

        // Auth admin token
        const auth = safeString(req.headers?.authorization);
        const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

        const adminToken = getEnv("CERT_ADMIN_TOKEN");
        if (!token || token !== adminToken) {
            return json(res, 401, { error: "Unauthorized", code: "UNAUTHORIZED" });
        }

        const body = parseJsonBody(req);
        if (!body) {
            return json(res, 400, { error: "Bad request", code: "BAD_REQUEST", details: { field: "body" } });
        }

        const company = body.company || {};
        const companyName = safeString(company.name);
        const level = safeString(body.level).toLowerCase();
        const allowedLevels = new Set(["bronze", "silver", "gold", "platinum"]);

        if (!companyName) {
            return json(res, 400, { error: "Bad request", code: "BAD_REQUEST", details: { field: "company.name" } });
        }
        if (!allowedLevels.has(level)) {
            return json(res, 400, { error: "Bad request", code: "BAD_REQUEST", details: { field: "level" } });
        }

        const expires_at = body.expires_at || null;
        const payload = body.payload && typeof body.payload === "object" ? body.payload : null;

        const supabase = createClient(
            getEnv("SUPABASE_URL"),
            getEnv("SUPABASE_SERVICE_ROLE_KEY")
        );

        const table = process.env.CERT_TABLE || "certificates";
        const issuer_name = process.env.CERT_ISSUER_NAME || "Rebel7 ESG";

        // Genera code e inserisci
        const certificate_code = makeCode();
        const issued_at = new Date().toISOString();

        // record “tollerante”: funziona sia con colonne flat sia con json
        const insertRow = {
            certificate_code,
            status: "valid",
            issued_at,
            expires_at,
            level,
            issuer_name,
            company: {
                name: companyName,
                vat: company.vat ?? null,
                country: company.country ?? null,
            },
            payload: payload ?? null,
            // opzionali
            audit_hash: crypto.createHash("sha256").update(`${certificate_code}|${issued_at}`).digest("hex"),
        };

        const { data: created, error } = await supabase
            .from(table)
            .insert(insertRow)
            .select("*")
            .single();

        if (error) {
            return json(res, 500, {
                error: "Internal error",
                code: "INTERNAL_ERROR",
                details: { supabase: error.message },
            });
        }

        // Se in futuro generi PDF in bucket, puoi popolare created.pdf_path e firmare url qui.
        // Per adesso lasciamo pdf nullo (schema lo supporta).
        return json(res, 201, {
            ok: true,
            certificate: {
                certificate_code: created.certificate_code || certificate_code,
                status: created.status || "valid",
                issued_at: created.issued_at || issued_at,
                expires_at: created.expires_at || expires_at,
                issuer_name: created.issuer_name || issuer_name,
                level: created.level || level,
                company: (created.company && typeof created.company === "object")
                    ? created.company
                    : { name: companyName, vat: company.vat ?? null, country: company.country ?? null },
                pdf: {
                    path: created.pdf_path || null,
                    url: null,
                    expires_in: null
                }
            }
        });
    } catch (e) {
        return json(res, 500, { error: "Internal error", code: "INTERNAL_ERROR", details: { message: e.message } });
    }
};
