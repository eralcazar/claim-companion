import {
  Home, FileText, Shield, Calendar, Pill, FolderOpen, User, Download,
  Users, Stethoscope, FolderTree, UserCog, KeyRound, GraduationCap, BadgeCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type FeatureKey =
  | "inicio" | "reclamos" | "polizas" | "formatos" | "agenda"
  | "medicamentos" | "registros" | "perfil"
  | "broker_panel" | "doctor_panel" | "admin_panel"
  | "format_manager" | "user_manager" | "access_manager"
  | "admin_especialidades" | "admin_medicos" | "doctor_profile";

export interface FeatureDef {
  key: FeatureKey;
  label: string;
  route: string;
  icon: LucideIcon;
  group: "principal" | "broker" | "medico" | "admin";
}

export const AVAILABLE_FEATURES: FeatureDef[] = [
  { key: "inicio", label: "Inicio", route: "/", icon: Home, group: "principal" },
  { key: "reclamos", label: "Reclamos", route: "/reclamos", icon: FileText, group: "principal" },
  { key: "agenda", label: "Agenda", route: "/agenda", icon: Calendar, group: "principal" },
  { key: "medicamentos", label: "Medicamentos", route: "/medicamentos", icon: Pill, group: "principal" },
  { key: "registros", label: "Registros Médicos", route: "/registros", icon: FolderOpen, group: "principal" },
  { key: "polizas", label: "Pólizas", route: "/polizas", icon: Shield, group: "principal" },
  { key: "formatos", label: "Formatos", route: "/formatos", icon: Download, group: "principal" },
  { key: "perfil", label: "Perfil", route: "/perfil", icon: User, group: "principal" },
  { key: "broker_panel", label: "Panel Broker", route: "/broker", icon: Users, group: "broker" },
  { key: "doctor_panel", label: "Panel Médico", route: "/medico", icon: Stethoscope, group: "medico" },
  { key: "admin_panel", label: "Panel Admin", route: "/admin", icon: Shield, group: "admin" },
  { key: "format_manager", label: "Gestor de Formatos", route: "/admin/gestor-archivos", icon: FolderTree, group: "admin" },
  { key: "user_manager", label: "Gestor de Usuarios", route: "/admin/usuarios", icon: UserCog, group: "admin" },
  { key: "access_manager", label: "Perfiles de Acceso", route: "/admin/perfiles-acceso", icon: KeyRound, group: "admin" },
  { key: "admin_especialidades", label: "Especialidades", route: "/admin/especialidades", icon: GraduationCap, group: "admin" },
  { key: "admin_medicos", label: "Médicos", route: "/admin/medicos", icon: BadgeCheck, group: "admin" },
  { key: "doctor_profile", label: "Mi Perfil Médico", route: "/medico/perfil", icon: BadgeCheck, group: "medico" },
];

export const ALL_ROLES = ["admin", "broker", "paciente", "medico"] as const;
export type AppRoleLite = (typeof ALL_ROLES)[number];