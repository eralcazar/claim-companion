## Problema

En `src/pages/Login.tsx`, el botón "Continuar con Google" llama a `lovable.auth.signInWithOAuth(provider)` **sin pasar `redirect_uri`**. Según el SDK de Lovable Cloud Managed Auth, este parámetro es obligatorio: sin él el navegador nunca redirige de vuelta a la app tras autenticarse en Google, o queda en un estado inconsistente donde la sesión no se establece.

Además, el código actual solo reacciona a `result.error`, pero ignora `result.redirected` (caso normal) y el caso "tokens recibidos" (sesión ya establecida, hay que navegar manualmente). Esto explica que aunque Google devuelva bien, el usuario se quede en `/login`.

Los errores `refresh_token_not_found` en los logs son ruido (sesiones viejas caducadas), no la causa real.

## Cambio

Actualizar `handleSignIn` en `src/pages/Login.tsx`:

```ts
const handleSignIn = async (provider: "google" | "apple") => {
  const result = await lovable.auth.signInWithOAuth(provider, {
    redirect_uri: window.location.origin,
  });

  if (result?.error) {
    toast.error("Error al iniciar sesión. Intente de nuevo.");
    return;
  }

  if (result?.redirected) {
    // El navegador redirigirá a Google — no hacer nada
    return;
  }

  // Tokens ya recibidos y sesión establecida — ir al dashboard
  navigate("/dashboard", { replace: true });
};
```

Esto es exactamente el patrón documentado y funciona en los tres dominios activos (`id-preview--*.lovable.app`, `carcentral.app`, `www.carcentral.app`) porque `window.location.origin` se resuelve al dominio actual y el broker de OAuth de Lovable ya acepta subdominios `.lovable.app` y dominios personalizados configurados.

## Archivos

- `src/pages/Login.tsx` — actualizar `handleSignIn` (único cambio).

## Fuera de alcance

- No tocar `AuthContext`, `lovable/index.ts` ni configuración del proveedor: la OAuth managed de Google ya está activa (probada antes) y no requiere credenciales propias.
- No modificar Apple (se aplica el mismo patrón por consistencia, pero solo si el usuario lo pide — este plan solo toca Google, aunque el fix aplica a ambos botones al compartir handler).
