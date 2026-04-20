

## Causa

El insert en `VisualEditor.tsx` (línea ~205) manda `origen: "auto_ia"`, pero la tabla `campos` tiene este CHECK:

```sql
CHECK (origen = ANY (ARRAY['auto'::text, 'manual'::text]))
```

Por eso PostgREST devuelve 400 con `campos_origen_check` y nada se guarda.

## Fix

Migración que reemplaza el constraint para incluir `'auto_ia'`:

```sql
ALTER TABLE public.campos DROP CONSTRAINT campos_origen_check;
ALTER TABLE public.campos ADD CONSTRAINT campos_origen_check
  CHECK (origen = ANY (ARRAY['auto'::text, 'manual'::text, 'auto_ia'::text]));
```

Sin cambios de código — el cliente ya manda el valor correcto y queremos preservar la trazabilidad (saber qué campos vinieron de IA).

## Archivos

```text
crea: supabase/migrations/<ts>_campos_origen_auto_ia.sql
```

