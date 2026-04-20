

## Diagnóstico

La asignación broker→paciente **sí existe** en la base de datos (eralcazar@gmail.com → erik.alcazar@totvs.com.br), pero el panel del broker no la muestra por dos razones:

1. **Query rota en `BrokerPanel.tsx`**: usa el hint `profiles!broker_patients_patient_id_fkey`, pero la tabla `broker_patients` no tiene foreign key declarada hacia `profiles` (sus columnas referencian `auth.users`, no `profiles.user_id`). PostgREST no puede resolver la relación y la query falla o devuelve datos vacíos.

2. **Warning secundario** (no bloqueante pero a corregir): `Badge` recibe un `ref` desde `UserRolesRow` y emite `Warning: Function components cannot be given refs`.

## Plan

### 1. Arreglar la carga de pacientes en `BrokerPanel.tsx`

Cambiar a una query en **dos pasos** (sin depender de FK declarada):

```ts
// 1) Traer asignaciones
const { data: assignments } = await supabase
  .from("broker_patients")
  .select("patient_id")
  .eq("broker_id", user.id);

// 2) Traer perfiles de esos patient_ids
const ids = (assignments ?? []).map(a => a.patient_id);
const { data: profiles } = await supabase
  .from("profiles")
  .select("user_id, full_name, first_name, paternal_surname, email, phone")
  .in("user_id", ids);
```

Luego mergear en memoria. Esto evita el hint de FK roto y la RLS de `profiles` (`Brokers can view assigned profiles`) ya autoriza la lectura.

Mejoras adicionales en la tarjeta:
- Mostrar nombre compuesto (`first_name + paternal_surname`) si `full_name` está vacío.
- Estado vacío más claro: si no hay asignaciones, mostrar mensaje y un link al admin para que sepa que necesita ser asignado.

### 2. Corregir el warning del `Badge` ref en `UserRolesRow.tsx`

El `Badge` está dentro de un `<div>` y no recibe ref directamente, pero el warning dice que sí. Probablemente sea por el `Badge` siendo hijo directo de un `TableCell` con algún wrapper que pasa `ref`. Envolverlo en un `<span>` neutro o revisar si el componente `Badge` necesita `forwardRef`. El fix más seguro: envolver el `Badge` en un `<span className="inline-flex">`.

### 3. Archivos a tocar

- `src/pages/BrokerPanel.tsx` — reescribir la query a dos pasos, mejorar render del nombre y estado vacío.
- `src/components/admin/UserRolesRow.tsx` — envolver `Badge` "Asignado" en un `<span>` para evitar el warning de ref.

## Resultado esperado

- En el panel del broker `eralcazar@gmail.com` aparecerá la tarjeta de **erik.alcazar@totvs.com.br** con su nombre, email y botón "Ver / actuar como".
- El warning de `Badge` ref desaparece de la consola.
- Cualquier broker ve correctamente todos sus pacientes asignados.

