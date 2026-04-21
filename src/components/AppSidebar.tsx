import {
  Home, FileText, Calendar, Pill, User, Shield, Users, Stethoscope, FolderOpen, Download, LogOut, FolderTree, UserCog, KeyRound, GraduationCap, BadgeCheck, FlaskConical
} from "lucide-react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import type { FeatureKey } from "@/lib/features";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type Item = { title: string; url: string; icon: typeof Home; feature: FeatureKey };

const mainItems: Item[] = [
  { title: "Inicio", url: "/", icon: Home, feature: "inicio" },
  { title: "Reclamos", url: "/reclamos", icon: FileText, feature: "reclamos" },
  { title: "Agenda", url: "/agenda", icon: Calendar, feature: "agenda" },
  { title: "Medicamentos", url: "/medicamentos", icon: Pill, feature: "medicamentos" },
  { title: "Recetas", url: "/recetas", icon: Pill, feature: "recetas" },
  { title: "Estudios", url: "/estudios", icon: FlaskConical, feature: "estudios" },
  { title: "Registros Médicos", url: "/registros", icon: FolderOpen, feature: "registros" },
  { title: "Pólizas", url: "/polizas", icon: Shield, feature: "polizas" },
  { title: "Formatos", url: "/formatos", icon: Download, feature: "formatos" },
  { title: "Perfil", url: "/perfil", icon: User, feature: "perfil" },
];

const brokerItems: Item[] = [
  { title: "Panel Broker", url: "/broker", icon: Users, feature: "broker_panel" },
];

const doctorItems: Item[] = [
  { title: "Panel Médico", url: "/medico", icon: Stethoscope, feature: "doctor_panel" },
  { title: "Mi Perfil Médico", url: "/medico/perfil", icon: BadgeCheck, feature: "doctor_profile" },
];

const adminItems: Item[] = [
  { title: "Panel Admin", url: "/admin", icon: Shield, feature: "admin_panel" },
  { title: "Gestor de Formatos", url: "/admin/gestor-archivos", icon: FolderTree, feature: "format_manager" },
  { title: "Médicos", url: "/admin/medicos", icon: BadgeCheck, feature: "admin_medicos" },
  { title: "Especialidades", url: "/admin/especialidades", icon: GraduationCap, feature: "admin_especialidades" },
  { title: "Gestor de Usuarios", url: "/admin/usuarios", icon: UserCog, feature: "user_manager" },
  { title: "Perfiles de Acceso", url: "/admin/perfiles-acceso", icon: KeyRound, feature: "access_manager" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { roles, signOut } = useAuth();
  const { can } = usePermissions();

  const isActive = (path: string) => location.pathname === path;

  const visibleMain = mainItems.filter((i) => can(i.feature));
  const visibleBroker = brokerItems.filter((i) => can(i.feature));
  const visibleDoctor = doctorItems.filter((i) => can(i.feature));
  const visibleAdmin = adminItems.filter((i) => can(i.feature));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && "Principal"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMain.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <RouterNavLink to={item.url} className={cn("flex items-center gap-2")}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </RouterNavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleBroker.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{!collapsed && "Broker"}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleBroker.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <RouterNavLink to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </RouterNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleDoctor.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{!collapsed && "Médico"}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleDoctor.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <RouterNavLink to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </RouterNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(roles.includes("admin") || visibleAdmin.length > 0) && (
          <SidebarGroup>
            <SidebarGroupLabel>{!collapsed && "Admin"}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {(roles.includes("admin") ? adminItems : visibleAdmin).map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <RouterNavLink to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </RouterNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="text-destructive">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Cerrar sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
