export default async function handler(req, res) {
    // CORS preflight
    if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        return res.status(204).end();
    }

    // Only POST
    if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
    }

    // --- AUTH (robusta) ---
    const AUTH_HEADER = req.headers.authorization || "";

    if (!AUTH_HEADER.startsWith("Bearer ")) {
        return res.status(401).json({
            ok: false,
            error: "Missing or invalid Authorization header",
            code: "UNAUTHORIZED",
        });
    }

    const incomingToken = AUTH_HEADER.slice(7).trim(); // rimuove "Bearer "
    const expectedToken = (process.env.CERT_ADMIN_TOKEN || "").trim();

    if (!expectedToken) {
        return res.status(500).json({
            ok: false,
            error: "CERT_ADMIN_TOKEN not configured",
            code: "SERVER_MISCONFIGURED",
        });
    }


    if (incomingToken !== expectedToken) {
        return res.status(401).json({
            ok: false,
            error: "Invalid API token",
            code: "UNAUTHORIZED",
        });
    }
    // --- AUTH OK ---

    // Body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const company_id = body?.company_id;

    if (!company_id) {
        return res.status(400).json({
            ok: false,
            error: "Missing company_id",
            code: "BAD_REQUEST",
        });
    }

    // Demo response (poi lo arricchiamo)
    return res.status(200).json({
        ok: true,
        service: "certificates",
        action: "generate",
        company_id,
    });
}
