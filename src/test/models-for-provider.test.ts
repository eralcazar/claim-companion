import { describe, it, expect } from "vitest";
import {
  modelsForProvider,
  defaultModelForProvider,
  type ExternalProviderRow,
} from "@/hooks/useAiPolicies";

const baseRow = (overrides: Partial<ExternalProviderRow>): ExternalProviderRow => ({
  id: overrides.id ?? "x",
  nombre: overrides.nombre ?? "X",
  endpoint: overrides.endpoint ?? "https://x",
  activo: overrides.activo ?? true,
  requires_api_key: overrides.requires_api_key ?? false,
  secret_name: overrides.secret_name ?? null,
  default_model: overrides.default_model ?? null,
  docs_url: overrides.docs_url ?? null,
  aviso_legal: overrides.aviso_legal ?? "",
  models: overrides.models ?? [],
});

const PROVIDERS = ["lovable", "apifreellm", "gemini", "mistral", "claude"];

describe("modelsForProvider / defaultModelForProvider — garantía de modelo utilizable", () => {
  it("lovable siempre expone catálogo interno con al menos un modelo", () => {
    const models = modelsForProvider("lovable", []);
    expect(models.length).toBeGreaterThan(0);
    expect(defaultModelForProvider("lovable", [])).toBeTruthy();
  });

  it("cae en 'standard' cuando el proveedor no está cargado aún (external undefined)", () => {
    for (const p of PROVIDERS.filter((x) => x !== "lovable")) {
      const models = modelsForProvider(p, undefined);
      expect(models.length).toBeGreaterThan(0);
      expect(models[0].value).toBe("standard");
      expect(defaultModelForProvider(p, undefined)).toBe("standard");
    }
  });

  it("cae en 'standard' cuando el proveedor existe pero no tiene modelos sincronizados", () => {
    const rows: ExternalProviderRow[] = [
      baseRow({ id: "apifreellm", nombre: "ApiFreeLLM", models: [] }),
      baseRow({ id: "gemini", nombre: "Gemini", models: [] }),
      baseRow({ id: "mistral", nombre: "Mistral", models: [] }),
      baseRow({ id: "claude", nombre: "Claude", models: [] }),
    ];
    for (const p of ["apifreellm", "gemini", "mistral", "claude"]) {
      const models = modelsForProvider(p, rows);
      expect(models).toEqual([{ value: "standard", label: "Estándar (auto)" }]);
      expect(defaultModelForProvider(p, rows)).toBe("standard");
    }
  });

  it("ApiFreeLLM: aún sin fila registrada, devuelve 'standard' utilizable", () => {
    expect(modelsForProvider("apifreellm", [])[0].value).toBe("standard");
    expect(defaultModelForProvider("apifreellm", [])).toBe("standard");
  });

  it("respeta el catálogo sincronizado cuando existe", () => {
    const rows: ExternalProviderRow[] = [
      baseRow({
        id: "gemini",
        nombre: "Gemini",
        default_model: "gemini-2.5-flash",
        models: [
          { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
          { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
        ],
      }),
    ];
    const models = modelsForProvider("gemini", rows);
    expect(models.map((m) => m.value)).toEqual(["gemini-2.5-flash", "gemini-2.5-pro"]);
    expect(defaultModelForProvider("gemini", rows)).toBe("gemini-2.5-flash");
  });

  it("si default_model está vacío pero hay modelos, usa el primero del catálogo", () => {
    const rows: ExternalProviderRow[] = [
      baseRow({
        id: "mistral",
        default_model: "   ",
        models: [{ id: "mistral-small-latest", label: "Mistral Small" }],
      }),
    ];
    expect(defaultModelForProvider("mistral", rows)).toBe("mistral-small-latest");
  });

  it("todos los proveedores conocidos devuelven un modelo utilizable en cualquier caso", () => {
    const scenarios: Array<ExternalProviderRow[] | undefined> = [
      undefined,
      [],
      PROVIDERS.filter((x) => x !== "lovable").map((id) => baseRow({ id, models: [] })),
    ];
    for (const external of scenarios) {
      for (const p of PROVIDERS) {
        const models = modelsForProvider(p, external);
        expect(models.length).toBeGreaterThan(0);
        expect(models[0].value).toBeTruthy();
        const def = defaultModelForProvider(p, external);
        expect(def).toBeTruthy();
      }
    }
  });
});