// Cálculo de macros por receta a partir del catálogo de ingredientes.
export type CatalogItem = {
  id: string;
  name: string;
  kcal_100g: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
};

export type RecipeIngredient = {
  name: string;
  grams: number;
  ingredient_id?: string | null;
};

export type MacroTotals = {
  kcal: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  matched: number;
  unmatched: number;
};

function round(n: number) { return Math.round(n * 10) / 10; }

export function computeMacros(ingredients: RecipeIngredient[], catalog: CatalogItem[]): MacroTotals {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const byName = new Map(catalog.map((c) => [c.name.toLowerCase().trim(), c]));
  let kcal = 0, carbs = 0, prot = 0, fat = 0, fib = 0, matched = 0, unmatched = 0;
  for (const ing of ingredients) {
    const g = Number(ing.grams) || 0;
    if (g <= 0) continue;
    const hit = (ing.ingredient_id && byId.get(ing.ingredient_id))
      || byName.get((ing.name || "").toLowerCase().trim());
    if (!hit) { unmatched++; continue; }
    const f = g / 100;
    kcal += (hit.kcal_100g || 0) * f;
    carbs += (hit.carbs_g || 0) * f;
    prot += (hit.protein_g || 0) * f;
    fat += (hit.fat_g || 0) * f;
    fib += (hit.fiber_g || 0) * f;
    matched++;
  }
  return { kcal: round(kcal), carbs_g: round(carbs), protein_g: round(prot), fat_g: round(fat), fiber_g: round(fib), matched, unmatched };
}

export function perServing(totals: MacroTotals, servings: number): Omit<MacroTotals, "matched" | "unmatched"> {
  const s = Math.max(1, servings || 1);
  return {
    kcal: round(totals.kcal / s),
    carbs_g: round(totals.carbs_g / s),
    protein_g: round(totals.protein_g / s),
    fat_g: round(totals.fat_g / s),
    fiber_g: round(totals.fiber_g / s),
  };
}