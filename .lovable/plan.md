## Diagnóstico

Tu usuario `eralcazar@gmail.com` tiene tres roles asignados: **admin**, **medico** y **paciente**.

En `src/pages/Domicilio.tsx` la lógica actual es:

```ts
const isMedico = roles.includes("medico") || roles.includes("admin");
<HomeVisitsPanel mode={isMedico ? "medico" : "paciente"} ... />
```

Como tenés `admin` + `medico`, la página siempre te renderiza en **modo profesional** (bandeja de solicitudes entrantes) y por eso **nunca ves el botón "Solicitar"**, aunque también seas paciente. El requisito de rol no se cumple porque la condición ignora tu `active_role`.

## Plan

1. **Respetar `profiles.active_role`** en `Domicilio.tsx`:
   - Si `active_role === "paciente"` → modo paciente (con botón Solicitar), incluso si también tenés `medico`/`admin`.
   - Si `active_role` es clínico (`medico`, `enfermero`, etc.) o `admin` → modo profesional.
   - Fallback al comportamiento actual si no hay `active_role`.

2. **Agregar un switch de vista** en la cabecera de `/domicilio` para usuarios multi-rol (paciente + clínico), que permita alternar entre "Mis solicitudes" y "Bandeja profesional" sin tener que cambiar el rol activo global.

3. **Verificación**: recargar `/domicilio` con `active_role = paciente` y confirmar que aparece el botón **Solicitar** y el diálogo de nueva solicitud.

Solo se toca `src/pages/Domicilio.tsx` (frontend). No hay cambios de esquema ni de RLS.
