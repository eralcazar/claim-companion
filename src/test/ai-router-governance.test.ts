import { describe, it, expect, vi } from "vitest";
import {
  routeExternalOrFallback,
  checkGovernance,
  detectPiiFields,
  hasResidualPii,
  normalizePrompt,
} from "../../supabase/functions/_shared/ai-router";

/**
 * Integración: verifica que el enrutador NUNCA envía datos al proveedor externo
 * cuando el kill switch está activo o el consentimiento fue revocado, y que
 * siempre registra auditoría con evidencia de sanitización.
 */

function makeAdmin(rpcImpl: (name: string, args: any) => Promise<{ data: any }>) {
  const rpc = vi.fn(rpcImpl);
  return { rpc, calls: rpc };
}

const PII_PROMPT =
  "Mi nombre es Juan Pérez, mi CURP GOMC800101HDFRRL05, teléfono 555 123 4567 y correo juan@example.com";

describe("checkGovernance", () => {
  it("bloquea cuando el kill switch admin está activo", async () => {
    const admin = makeAdmin(async () => ({ data: { allowed: false, reason: "kill_switch" } }));
    const decision = await checkGovernance(admin as any, "user-1", "kari_chat");
    expect(decision.allowed).toBe(false);
    expect(decision.provider).toBe("fallback");
    if (!decision.allowed) expect(decision.reason).toBe("kill_switch");
  });

  it("bloquea cuando el usuario revocó consentimiento para la feature", async () => {
    const admin = makeAdmin(async () => ({ data: { allowed: false, reason: "consent_revoked" } }));
    const decision = await checkGovernance(admin as any, "user-1", "activity_coach");
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toBe("consent_revoked");
  });

  it("permite cuando hay consentimiento y kill switch inactivo", async () => {
    const admin = makeAdmin(async () => ({ data: { allowed: true } }));
    const decision = await checkGovernance(admin as any, "user-1", "kari_chat");
    expect(decision.allowed).toBe(true);
  });

  it("fail-closed: si la RPC falla, no permite salida externa", async () => {
    const admin = makeAdmin(async () => {
      throw new Error("db down");
    });
    const decision = await checkGovernance(admin as any, "user-1", "kari_chat");
    expect(decision.allowed).toBe(false);
  });
});

describe("routeExternalOrFallback — kill switch", () => {
  it("NUNCA llama al externo y siempre registra auditoría con fallback_used=true", async () => {
    const admin = makeAdmin(async (name) => {
      if (name === "can_call_external_ai") return { data: { allowed: false, reason: "kill_switch" } };
      if (name === "log_ai_audit") return { data: "audit-id-1" };
      return { data: null };
    });
    const external = vi.fn(async () => ({ content: "EXT" }));
    const fallback = vi.fn(async () => ({ content: "SAFE" }));

    const res = await routeExternalOrFallback({
      admin: admin as any,
      userId: "u1",
      featureKey: "kari_chat",
      provider: "apifreellm",
      model: "external-model",
      rawUserPrompt: PII_PROMPT,
      external,
      fallback,
    });

    expect(external).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledOnce();
    expect(res.fallbackUsed).toBe(true);
    expect(res.blockedReason).toBe("kill_switch");
    expect(res.provider).toBe("lovable");
    expect(res.content).toBe("SAFE");

    const auditCall = admin.calls.mock.calls.find(([n]) => n === "log_ai_audit");
    expect(auditCall).toBeDefined();
    const args = auditCall![1];
    expect(args._fallback_used).toBe(true);
    expect(args._blocked_reason).toBe("kill_switch");
    expect(args._consent_checked).toBe(true);
    expect(args._pii_fields).toContain("curp");
    expect(args._pii_fields).toContain("email");
    // El prompt guardado NO puede contener el CURP ni el email en claro
    expect(args._sanitized_prompt).not.toContain("GOMC800101HDFRRL05");
    expect(args._sanitized_prompt).not.toContain("juan@example.com");
  });
});

describe("routeExternalOrFallback — consent revoked", () => {
  it("bloquea externo, fuerza fallback y no filtra PII a la llamada externa", async () => {
    const admin = makeAdmin(async (name) => {
      if (name === "can_call_external_ai")
        return { data: { allowed: false, reason: "consent_revoked" } };
      return { data: null };
    });
    const external = vi.fn(async () => ({ content: "EXT" }));
    const fallback = vi.fn(async () => ({ content: "SAFE" }));

    const res = await routeExternalOrFallback({
      admin: admin as any,
      userId: "u1",
      featureKey: "activity_coach",
      provider: "openai",
      model: "gpt",
      rawUserPrompt: PII_PROMPT,
      external,
      fallback,
    });

    expect(external).not.toHaveBeenCalled();
    expect(res.blockedReason).toBe("consent_revoked");
    expect(res.fallbackUsed).toBe(true);
  });
});

describe("routeExternalOrFallback — residual PII safety net", () => {
  it("aún con consentimiento, bloquea si sanitizado conserva dirección o coordenadas", async () => {
    const admin = makeAdmin(async (name) => {
      if (name === "can_call_external_ai") return { data: { allowed: true } };
      return { data: null };
    });
    const external = vi.fn(async () => ({ content: "EXT" }));
    const fallback = vi.fn(async () => ({ content: "SAFE" }));

    const res = await routeExternalOrFallback({
      admin: admin as any,
      userId: "u1",
      featureKey: "kari_chat",
      provider: "openai",
      model: "gpt",
      rawUserPrompt: "Vivo en calle Reforma 123, colonia Centro. Explícame qué es diabetes.",
      external,
      fallback,
    });

    expect(external).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledOnce();
    expect(res.blockedReason).toBe("residual_pii");
  });

  it("permite externo cuando no hay PII residual y consentimiento OK", async () => {
    const admin = makeAdmin(async (name) => {
      if (name === "can_call_external_ai") return { data: { allowed: true } };
      return { data: null };
    });
    const external = vi.fn(async () => ({ content: "EXT" }));
    const fallback = vi.fn(async () => ({ content: "SAFE" }));

    const res = await routeExternalOrFallback({
      admin: admin as any,
      userId: "u1",
      featureKey: "kari_chat",
      provider: "openai",
      model: "gpt",
      rawUserPrompt: "¿Qué es la diabetes tipo 2?",
      external,
      fallback,
    });

    expect(external).toHaveBeenCalledOnce();
    expect(fallback).not.toHaveBeenCalled();
    expect(res.blockedReason).toBeNull();
    expect(res.provider).toBe("openai");
    expect(res.content).toBe("EXT");
  });
});

describe("detectPiiFields + sanitizer coherencia", () => {
  it("detecta múltiples tipos y la normalización los enmascara", () => {
    const fields = detectPiiFields(PII_PROMPT);
    expect(fields).toEqual(expect.arrayContaining(["curp", "email"]));
    const sanitized = normalizePrompt(PII_PROMPT);
    expect(sanitized).not.toMatch(/gomc800101hdfrrl05/i);
    expect(sanitized).not.toContain("juan@example.com");
  });

  it("hasResidualPii detecta direcciones postales y coordenadas", () => {
    expect(hasResidualPii("vivo en avenida insurgentes")).toBe(true);
    expect(hasResidualPii("coordenadas 19.4326,-99.1332")).toBe(true);
    expect(hasResidualPii("que es la hipertension")).toBe(false);
  });
});