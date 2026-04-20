import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ALL_ROLES, type AppRoleLite } from "@/lib/features";
import { Dice5, Copy, Eye, EyeOff } from "lucide-react";

const ROLE_LABEL: Record<AppRoleLite, string> = {
  admin: "Admin",
  broker: "Broker",
  paciente: "Paciente",
  medico: "Médico",
};

function generatePassword(length = 12) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let pw = "";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) pw += chars[arr[i] % chars.length];
  return pw;
}

export function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [roles, setRoles] = useState<AppRoleLite[]>(["paciente"]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setRoles(["paciente"]);
    setShowPw(false);
  };

  const toggleRole = (r: AppRoleLite, checked: boolean) => {
    setRoles((cur) =>
      checked ? Array.from(new Set([...cur, r])) : cur.filter((x) => x !== r),
    );
  };

  const handleGenerate = () => {
    const pw = generatePassword(12);
    setPassword(pw);
    setShowPw(true);
  };

  const handleCopy = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    toast({ title: "Contraseña copiada" });
  };

  const handleSave = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      toast({
        title: "Faltan datos",
        description: "Nombre, email y contraseña son requeridos",
        variant: "destructive",
      });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({
        title: "Email inválido",
        description: "Verifica el formato del correo",
        variant: "destructive",
      });
      return;
    }
    if (password.length < 8) {
      toast({
        title: "Contraseña corta",
        description: "Mínimo 8 caracteres",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "create",
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          roles,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      qc.invalidateQueries({ queryKey: ["users_with_roles"] });
      toast({
        title: "Usuario creado",
        description: `${fullName} (${email})`,
      });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "No se pudo crear el usuario",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>
            Crea un usuario con sus credenciales y roles iniciales.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="cu-name">Nombre completo</Label>
            <Input
              id="cu-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Pérez"
              maxLength={120}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cu-email">Email</Label>
            <Input
              id="cu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              maxLength={255}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cu-pw">Contraseña inicial</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="cu-pw"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Ocultar" : "Mostrar"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                title="Generar contraseña"
              >
                <Dice5 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!password}
                title="Copiar"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Compártela con el usuario por un canal seguro.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_ROLES.map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={roles.includes(r)}
                    onCheckedChange={(c) => toggleRole(r, Boolean(c))}
                  />
                  <span className="text-sm">{ROLE_LABEL[r]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Creando..." : "Crear usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}