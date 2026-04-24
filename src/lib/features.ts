import {
  Home, FileText, Shield, Calendar, Pill, FolderOpen, User, Download,
  Users, Stethoscope, FolderTree, UserCog, KeyRound, GraduationCap, BadgeCheck, FlaskConical, TrendingUp,
  HeartPulse, FlaskRound, Store, UserCheck, FileWarning,
  Package, Boxes, Layers, CreditCard, Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type FeatureKey =
  | "inicio" | "reclamos" | "polizas" | "formatos" | "agenda"
  | "medicamentos" | "registros" | "perfil"
  | "broker_panel" | "doctor_panel" | "admin_panel"
  | "format_manager" | "user_manager" | "access_manager"
  | "admin_especialidades" | "admin_medicos" | "doctor_profile"
  | "recetas" | "estudios" | "tendencias"
  | "nurse_panel" | "lab_panel" | "pharmacy_panel"
  | "patient_personnel_manager" | "patient_view"
  | "claims_without_report"
  | "product_manager" | "inventory_manager" | "plan_manager"
  | "planes" | "suscripcion" | "consultorio"
  | "presion_arterial";

export interface FeatureDef {
  key: FeatureKey;
  label: string;
  route: string;
  icon: LucideIcon;
  group: "principal" | "broker" | "medico" | "admin" | "enfermero" | "laboratorio" | "farmacia";
}

export const AVAILABLE_FEATURES: FeatureDef[] = [
  { key: "inicio", label: "Panel de Paciente", route: "/", icon: Home, group: "principal" },
  { key: "reclamos", label: "Reclamos", route: "/reclamos", icon: FileText, group: "principal" },
  { key: "agenda", label: "Agenda", route: "/agenda", icon: Calendar, group: "principal" },
  { key: "medicamentos", label: "Medicamentos", route: "/medicamentos", icon: Pill, group: "principal" },
  { key: "registros", label: "Registros Médicos", route: "/registros", icon: FolderOpen, group: "principal" },
  { key: "polizas", label: "Pólizas", route: "/polizas", icon: Shield, group: "principal" },
  { key: "formatos", label: "Formatos", route: "/formatos", icon: Download, group: "principal" },
  { key: "recetas", label: "Recetas", route: "/recetas", icon: Pill, group: "principal" },
  { key: "estudios", label: "Estudios", route: "/estudios", icon: FlaskConical, group: "principal" },
  { key: "tendencias", label: "Tendencias", route: "/tendencias", icon: TrendingUp, group: "principal" },
  { key: "presion_arterial", label: "Presión arterial", route: "/presion", icon: Activity, group: "principal" },
  { key: "perfil", label: "Perfil", route: "/perfil", icon: User, group: "principal" },
  { key: "patient_personnel_manager", label: "Mis accesos", route: "/perfil/accesos", icon: UserCheck, group: "principal" },
  { key: "planes", label: "Planes", route: "/planes", icon: CreditCard, group: "principal" },
  { key: "suscripcion", label: "Mi suscripción", route: "/suscripcion", icon: CreditCard, group: "principal" },
  { key: "broker_panel", label: "Panel Broker", route: "/broker", icon: Users, group: "broker" },
  { key: "doctor_panel", label: "Panel Médico", route: "/medico", icon: Stethoscope, group: "medico" },
  { key: "claims_without_report", label: "Reclamos sin informe", route: "/medico/reclamos-sin-informe", icon: FileWarning, group: "medico" },
  { key: "nurse_panel", label: "Panel Enfermería", route: "/enfermeria", icon: HeartPulse, group: "enfermero" },
  { key: "lab_panel", label: "Panel Laboratorio", route: "/laboratorio", icon: FlaskRound, group: "laboratorio" },
  { key: "pharmacy_panel", label: "Panel Farmacia", route: "/farmacia", icon: Store, group: "farmacia" },
  { key: "inventory_manager", label: "Inventario", route: "/farmacia/inventario", icon: Boxes, group: "farmacia" },
  { key: "patient_view", label: "Vista de paciente", route: "/personal/paciente", icon: User, group: "principal" },
  { key: "admin_panel", label: "Panel Admin", route: "/admin", icon: Shield, group: "admin" },
  { key: "format_manager", label: "Gestor de Formatos", route: "/admin/gestor-archivos", icon: FolderTree, group: "admin" },
  { key: "user_manager", label: "Gestor de Usuarios", route: "/admin/usuarios", icon: UserCog, group: "admin" },
  { key: "access_manager", label: "Perfiles de Acceso", route: "/admin/perfiles-acceso", icon: KeyRound, group: "admin" },
  { key: "admin_especialidades", label: "Especialidades", route: "/admin/especialidades", icon: GraduationCap, group: "admin" },
  { key: "admin_medicos", label: "Médicos", route: "/admin/medicos", icon: BadgeCheck, group: "admin" },
  { key: "product_manager", label: "Productos tienda", route: "/admin/productos", icon: Package, group: "admin" },
  { key: "plan_manager", label: "Paquetes / Planes", route: "/admin/planes", icon: Layers, group: "admin" },
  { key: "doctor_profile", label: "Mi Perfil Médico", route: "/medico/perfil", icon: BadgeCheck, group: "medico" },
  { key: "consultorio", label: "Consultorio", route: "/consultorio", icon: Stethoscope, group: "medico" },
];

export const ALL_ROLES = ["admin", "broker", "paciente", "medico", "enfermero", "laboratorio", "farmacia"] as const;
export type AppRoleLite = (typeof ALL_ROLES)[number];