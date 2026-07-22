import { describe, it, expect } from "vitest";
import { normalizePrompt, isCacheableGeneric, hasResidualPii } from "@/lib/ai/sanitize";

describe("normalizePrompt — sanitización PII", () => {
  it("enmascara CURP", () => {
    const out = normalizePrompt("Mi CURP es HEGJ850315HDFRRR09");
    expect(out).toContain("[curp]");
    expect(out).not.toContain("hegj850315");
  });
  it("enmascara RFC", () => {
    const out = normalizePrompt("RFC MARJ850315AB1");
    expect(out).toContain("[rfc]");
  });
  it("enmascara emails", () => {
    const out = normalizePrompt("contactame en juan.perez@ejemplo.mx pls");
    expect(out).toContain("[email]");
    expect(out).not.toContain("juan.perez");
  });
  it("enmascara teléfonos de 10 dígitos", () => {
    const out = normalizePrompt("mi tel 5512345678 llamame");
    expect(out).toContain("[tel]");
    expect(out).not.toContain("5512345678");
  });
  it("enmascara fechas", () => {
    expect(normalizePrompt("nacido 15/03/1985")).toContain("[fecha]");
    expect(normalizePrompt("hoy 2025-11-30")).toContain("[fecha]");
  });
  it("enmascara ids/números grandes", () => {
    expect(normalizePrompt("expediente 12345678")).toContain("[num]");
  });
});

describe("isCacheableGeneric — decide qué no viaja al caché", () => {
  it("rechaza prompts con contexto personal (mi paciente)", () => {
    const original = "Mi paciente tiene 60 años, qué hago";
    expect(isCacheableGeneric(original, normalizePrompt(original))).toBe(false);
  });
  it("rechaza mediciones específicas (mmHg)", () => {
    const original = "Tengo presión 140/90 mmhg hace días";
    expect(isCacheableGeneric(original, normalizePrompt(original))).toBe(false);
  });
  it("acepta preguntas educativas genéricas", () => {
    const original = "¿Qué es la hipertensión arterial?";
    expect(isCacheableGeneric(original, normalizePrompt(original))).toBe(true);
  });
  it("rechaza prompts vacíos o demasiado largos", () => {
    expect(isCacheableGeneric("hola", "hola")).toBe(false);
    expect(isCacheableGeneric("a".repeat(600), "a".repeat(600))).toBe(false);
  });
});

describe("hasResidualPii — red de seguridad post-sanitización", () => {
  it("detecta direcciones con calle/colonia/cp", () => {
    expect(hasResidualPii("vivo en calle reforma numero [num]")).toBe(true);
    expect(hasResidualPii("colonia roma norte")).toBe(true);
    expect(hasResidualPii("cp 06700")).toBe(true);
  });
  it("detecta coordenadas GPS aproximadas", () => {
    expect(hasResidualPii("estoy en 19.4326,-99.1332")).toBe(true);
  });
  it("detecta teléfonos con formato internacional", () => {
    expect(hasResidualPii("llamame al +52 55 1234 5678")).toBe(true);
  });
  it("no marca texto genérico", () => {
    expect(hasResidualPii("que es la diabetes tipo dos")).toBe(false);
  });
});

describe("Casos límite — nombres propios y ubicaciones aproximadas", () => {
  it("nombres propios NO son enmascarados por normalizePrompt (limitación conocida)", () => {
    // Esta prueba documenta la limitación: normalizePrompt no borra nombres.
    // Por eso el router bloquea envío externo si hasResidualPii o si el usuario
    // no dio consentimiento explícito por feature.
    const out = normalizePrompt("Juan Pérez pregunta");
    expect(out).toContain("juan");
  });
  it("ubicación aproximada (colonia) queda marcada por hasResidualPii", () => {
    const original = "Vivo en colonia Condesa";
    const norm = normalizePrompt(original);
    expect(hasResidualPii(norm)).toBe(true);
  });
});