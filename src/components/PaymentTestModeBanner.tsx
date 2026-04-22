const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;
  return (
    <div className="w-full bg-warning/10 border-b border-warning/30 px-4 py-2 text-center text-xs text-warning-foreground">
      Pagos en modo de prueba — usa la tarjeta <code className="font-mono">4242 4242 4242 4242</code>.
    </div>
  );
}