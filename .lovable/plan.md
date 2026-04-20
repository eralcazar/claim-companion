

## Diagnóstico

El código **ya tiene** la columna "Broker asignado" en `UserManager.tsx` (línea 139) y la celda con el `Select` de brokers en `UserRolesRow.tsx` (líneas 123-141). Está renderizada y funcional.

El problema es **visibilidad**:
- La tabla tiene 7 columnas: Usuario · Email · Broker asignado · Admin · Broker · Paciente · Médico
- En tu viewport de 984px y con `overflow-x-auto`, las primeras 3 columnas quedan visibles solo si haces scroll horizontal o reduces ancho de las otras
- En la sesión, lo que veo en pantalla es el final de la tabla (Médico, Paciente, Broker, Admin) y solo si haces scroll a la derecha ves Usuario/Email/Broker asignado, o al revés

Además, hoy solo hay **1 usuario** en el sistema (tú: ERIK) y tiene rol `paciente`, así que la columna "Broker asignado" debería mostrar un `Select` con la opción "Sin broker" disponible. El único broker disponible para asignar serías tú mismo.

## Plan

### 1. Reordenar columnas para priorizar lo importante

Nuevo orden: **Usuario · Broker asignado · [Admin · Broker · Paciente · Médico] · Email**

Email pasa al final (información secundaria), y "Broker asignado" queda inmediatamente después del nombre del usuario, donde se ve sin scroll.

### 2. Hacer la columna "Broker asignado" más visible

- Ancho mínimo fijo `min-w-[180px]` en el header
- Fondo sutil `bg-muted/30` en la celda para distinguirla visualmente
- Header con texto destacado (negrita)

### 3. Ajustar columnas de roles para que ocupen menos

- Cada switch column con `w-20` para que no consuman tanto ancho
- Etiqueta más pequeña debajo del switch en mobile (ya está)

### 4. Mensaje informativo cuando no hay otros brokers

Si el único broker disponible es el mismo usuario en la fila, mostrar un texto pequeño al lado del Select: "No puedes asignarte como broker de ti mismo" — y filtrar al usuario actual de la lista de brokers seleccionables.

### 5. Indicador visual cuando ya tiene broker asignado

Badge verde pequeño al lado del Select cuando hay un broker asignado, para que quede obvio.

## Archivos a tocar

- `src/pages/admin/UserManager.tsx` — reordenar `<TableHead>` y mover Email al final
- `src/components/admin/UserRolesRow.tsx` — reordenar celdas igual, agregar estilos de visibilidad, filtrar self-broker, badge visual

## Resultado esperado

En tu viewport de 984px verás sin scroll: **Usuario | Broker asignado (con Select destacado) | Admin | Broker | Paciente | Médico** y Email al final accesible con scroll. La columna "Broker asignado" será imposible de no ver.

