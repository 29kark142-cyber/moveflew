import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { normalizeLead, saveLead } from "@/lib/lead-intake.server";

// Accepts either a secret API key (server-to-server) or a public widget key.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Widget-Key, Idempotency-Key",
  "Cache-Control": "no-store",
};
const reply = (status: number, body: unknown) => Response.json(body, { status, headers: cors });
const MESSAGES: Record<number, string> = {
  401: "Invalid or revoked key", 429: "Too many submissions; retry shortly", 400: "Check the submitted fields", 503: "The lead could not be saved; retry",
};

export const Route = createFileRoute("/api/public/v1/leads")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const bearer = request.headers.get("Authorization")?.replace(/^Bearer /, "");
        const widget = request.headers.get("X-Widget-Key");
        const credential = bearer && /^sk_[a-f0-9]{48}$/.test(bearer) ? bearer : widget && /^pk_[a-f0-9]{32}$/.test(widget) ? widget : null;
        if (!credential) return reply(401, { error: "An API key or widget key is required" });
        const requestId = z.string().min(8).max(100).regex(/^[a-zA-Z0-9_-]+$/).safeParse(request.headers.get("Idempotency-Key"));
        if (!requestId.success) return reply(400, { error: "Provide an Idempotency-Key header" });
        const raw = await request.text();
        if (raw.length > 16000) return reply(413, { error: "Submission too large" });
        let body: unknown;
        try { body = JSON.parse(raw); } catch { return reply(400, { error: "Invalid JSON" }); }
        if ((body as { website?: string })?.website) return reply(201, { received: true }); // honeypot
        const lead = normalizeLead(body);
        if (!lead) return reply(400, { error: "A name is required" });
        const status = await saveLead(credential, requestId.data, lead);
        return status === 201 ? reply(201, { received: true }) : reply(status, { error: MESSAGES[status] });
      },
    },
  },
});
