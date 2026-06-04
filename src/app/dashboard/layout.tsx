
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from 'react';
import {
  Home,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Network,
  ClipboardList,
  Map,
  Send,
  TrendingUp,
  HeartHandshake,
  CalendarDays,
  CalendarCheck,
  ScanLine,
  GraduationCap,
  BookOpen,
  UserCheck as UserCheckIcon,
  Users2,
  CalendarPlus,
  Briefcase,
  Church,
  CheckSquare,
  Upload,
  CalendarCog,
  Bot,
  Footprints,
  FileText,
  HandHelping,
  Shield,
  CalendarClock,
  Save,
  LayoutTemplate,
  Menu,
  BarChart2,
  Search,
  Bell,
  Moon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  SidebarProvider,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Logo } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirebase, useDoc } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { PendingAccess } from "@/components/auth/pending-access";
import { userRoles } from '@/lib/roles';
import { Input } from "@/components/ui/input";
import type { AccessProfile } from '@/app/dashboard/settings/page';

const menuItems = [
    { href: "/dashboard", label: "Painel Geral", icon: Home, permissionId: 'dashboard' },
    { 
      label: "Pessoas", 
      icon: Users,
      subItems: [
        { href: "/dashboard/people/journey", label: "Integração", icon: Footprints, permissionId: 'pessoas_journey' },
        { href: "/dashboard/people/list", label: "Lista de Pessoas", icon: Users2, permissionId: 'pessoas_list' },
        { href: "/dashboard/people/settings", label: "Configurações", icon: Settings, permissionId: 'pessoas_settings' },
      ]
    },
    { 
      label: "GCs", 
      icon: HeartHandshake,
      subItems: [
        { href: "/dashboard/gc/structure", label: "Estrutura", icon: Network, permissionId: 'gcs_structure' },
        { href: "/dashboard/gc/cells", label: "Células", icon: Users2, permissionId: 'gcs_cells' },
        { href: "/dashboard/gc/report", label: "Relatório de Célula", icon: ClipboardList, permissionId: 'gcs_report' },
        { href: "/dashboard/gc/supervisor", label: "Supervisor", icon: BarChart2, permissionId: 'gcs_supervisor' },
        { href: "/dashboard/gc/map", label: "Mapa", icon: Map, permissionId: 'gcs_map' },
      ]
    },
    {
      label: "Serviço",
      icon: HandHelping,
      subItems: [
        { href: "/dashboard/volunteering", label: "Áreas de Serviço", icon: HandHelping, permissionId: 'servico_areas' },
        { href: "/dashboard/volunteering/teams", label: "Equipes", icon: Shield, permissionId: 'servico_teams' },
        { href: "/dashboard/volunteering/events", label: "Gerenciar Eventos", icon: CalendarPlus, permissionId: 'servico_events' },
        { href: "/dashboard/volunteering/schedule", label: "Gerar Escala", icon: CalendarCog, permissionId: 'servico_schedule' },
        { href: "/dashboard/volunteering/saved-schedules", label: "Escalas Salvas", icon: Save, permissionId: 'servico_saved' },
      ]
    },
    { 
      label: "Ministerial", 
      icon: Church,
      subItems: [
        { href: "/dashboard/attendance", label: "Frequência (Culto)", icon: CheckSquare, permissionId: 'ministerial_attendance' },
        { 
            label: "Ensino", 
            icon: GraduationCap,
            subItems: [
              { href: "/dashboard/teaching/courses", label: "Dashboard & Catálogo", icon: LayoutTemplate, permissionId: 'teaching_courses' },
              { href: "/dashboard/teaching/theoflix", label: "TheoFlix", icon: BookOpen, permissionId: 'teaching_theoflix' },
              { href: "/dashboard/teaching/calendar", label: "Calendário Escolar", icon: CalendarDays, permissionId: 'teaching_courses' },
              { href: "/dashboard/teaching/teachers", label: "Professores", icon: UserCheckIcon, permissionId: 'teaching_courses' },
              { href: "/dashboard/teaching/students", label: "Alunos", icon: Users2, permissionId: 'teaching_courses' },
            ]
        },
        { 
            label: "Eventos", 
            icon: CalendarDays,
            subItems: [
              { href: "/dashboard/events", label: "Protocolos de Evento", icon: CalendarCheck, permissionId: 'ministerial_events' },
              { href: "/dashboard/briefing-pro", label: "Briefing Pro", icon: FileText, permissionId: 'ministerial_briefing' },
              { href: "/dashboard/events/reservations", label: "Calendário Geral", icon: CalendarClock, permissionId: 'ministerial_reservations' },
            ]
        },
        { href: "/dashboard/finance", label: "Financeiro", icon: Briefcase, permissionId: 'ministerial_finance' },
        { href: "/dashboard/patrimony", label: "Patrimônio", icon: ScanLine, permissionId: 'ministerial_patrimony' },
        { href: "/dashboard/social", label: "Ação Social", icon: Users, permissionId: 'ministerial_social' },
        { href: "/dashboard/goals", label: "Metas (KPIs)", icon: TrendingUp, permissionId: 'ministerial_goals' },
        { href: "/dashboard/ai-agent", label: "Agente IA", icon: Bot, permissionId: 'ministerial_ai' },
        { href: "/dashboard/notifications", label: "Notificações", icon: Send, permissionId: 'ministerial_notifications' },
      ]
    },
    { href: "/public/enrollment", label: "Inscrições", icon: ClipboardList, permissionId: 'inscricoes', target: '_blank' },
    { href: "/dashboard/import-data", label: "Importar Dados", icon: Upload, permissionId: 'settings' },
];

const settingsMenuItems = [
    { href: "/dashboard/settings", label: "Geral", icon: Settings, permissionId: 'settings' },
    { href: "/dashboard/settings/churches", label: "Minha Igreja", icon: Church, permissionId: 'settings' },
    { href: "/dashboard/settings/notifications", label: "Notificações", icon: Send, permissionId: 'settings' },
];

type MenuPermissions = Record<string, Record<string, boolean>> | undefined;

interface MenuItemsProps {
  pathname: string;
  permissions: MenuPermissions;
  userRole: string | undefined;
  onLinkClick: () => void;
}

function MenuItems({ pathname, permissions, userRole, onLinkClick }: MenuItemsProps) {
  // IDs acessíveis por padrão para qualquer membro autenticado (sem perfil de acesso específico)
  const DEFAULT_MEMBER_PERMISSIONS = new Set(['dashboard', 'teaching_courses', 'gcs_report']);

  const hasPermission = (permissionId: string | undefined, action: string = 'view') => {
    if (!permissionId) return true;
    if (userRole === 'admin') return true;
    
    const gcAccessRoles = ['lider_gc', 'lider_treinamento', 'colider', 'secretario', 'secretaria', 'lider'];
    if ((permissionId === 'gcs_cells' || permissionId === 'gcs_report') && userRole && gcAccessRoles.includes(userRole)) {
      return true;
    }

    // Se não há perfil de acesso mas é uma rota liberada por padrão para membros
    if (!permissions) return DEFAULT_MEMBER_PERMISSIONS.has(permissionId);
    return !!permissions[permissionId]?.[action];
  };

  const filterItems = (itemsToFilter: any[]): any[] => {
    return itemsToFilter.map(item => {
      if (item.subItems) {
        const visibleSubItems = filterItems(item.subItems);
        return visibleSubItems.length > 0 ? { ...item, subItems: visibleSubItems } : null;
      }
      return hasPermission(item.permissionId) ? item : null;
    }).filter(Boolean);
  };

  const renderMenuItems = (items: any[]) => {
    return items.map((item, index) => {
      const isCollapsibleOpen = item.subItems?.some((sub: any) => 
        (sub.href && pathname.startsWith(sub.href)) || 
        (sub.subItems && sub.subItems.some((subsub: any) => subsub.href && pathname.startsWith(subsub.href)))
      );

      const baseItemClasses = "w-full justify-start items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600 font-medium transition-all duration-200 hover:bg-slate-100 hover:text-slate-900";
      const activeItemClasses = "bg-primary/10 text-primary font-semibold";

      if (item.subItems) {
        return (
          <Collapsible key={index} className="w-full" defaultOpen={isCollapsibleOpen}>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild className="w-full">
                <SidebarMenuButton 
                  className={cn(baseItemClasses, "justify-between", isCollapsibleOpen && "text-slate-900")} 
                  isActive={isCollapsibleOpen}>
                    <div className="flex items-center gap-3">
                      {item.icon && <item.icon className="size-5 shrink-0" />}
                      <span>{item.label}</span>
                    </div>
                    <ChevronDown className="size-4 transition-transform [&[data-state=open]]:rotate-180 shrink-0" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
            </SidebarMenuItem>
            <CollapsibleContent asChild>
               <SidebarMenu className="ml-4 pl-4 my-1 space-y-1 border-l border-slate-200">
                  {renderMenuItems(item.subItems)}
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        );
      }
      
      if (item.href) {
        const isActive = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={isActive} className={cn(baseItemClasses, isActive && activeItemClasses)}>
              <Link href={item.href} onClick={onLinkClick} target={item.target}>
                {item.icon && <item.icon className="size-5 shrink-0" />}
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      }
      return null;
    });
  }

  const visibleItems = filterItems(menuItems);
  const visibleSettingsItems = filterItems(settingsMenuItems);

  return (
    <div className="flex flex-col grow overflow-y-auto">
      <SidebarMenu className="py-4 space-y-1 px-3">
        <li className="px-3 pb-2 text-sm font-semibold tracking-wider text-slate-500 uppercase">Menu</li>
        {renderMenuItems(visibleItems)}
      </SidebarMenu>
      <SidebarMenu className="space-y-1 p-3 mt-auto">
        {(userRole === 'admin' || userRole === 'pastor_senior') && (
           <Collapsible className="w-full" defaultOpen={pathname.startsWith('/dashboard/settings')}>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild className="w-full">
                <SidebarMenuButton 
                  className={cn("w-full justify-start items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600 font-medium transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 justify-between", pathname.startsWith('/dashboard/settings') && "text-slate-900")} 
                  isActive={pathname.startsWith('/dashboard/settings')}>
                    <div className="flex items-center gap-3">
                      <Settings className="size-5 shrink-0" />
                      <span>Configurações</span>
                    </div>
                    <ChevronDown className="size-4 transition-transform [&[data-state=open]]:rotate-180 shrink-0" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
            </SidebarMenuItem>
            <CollapsibleContent asChild>
              <SidebarMenu className="ml-4 pl-4 my-1 space-y-1 border-l border-slate-200">
                {renderMenuItems(visibleSettingsItems)}
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        )}
      </SidebarMenu>
    </div>
  );
}

interface MobileMenuProps extends MenuItemsProps {
  children: React.ReactNode;
}

function MobileMenu({ pathname, permissions, userRole, onLinkClick, children }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLinkClick = () => {
    setIsOpen(false);
    onLinkClick();
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col p-0 w-72">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Navegue pelas seções do painel.</SheetDescription>
        <SidebarHeader className="border-b border-slate-200">
          <div className="flex items-center justify-start px-6 h-20 w-full">
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/studio-1424813022-71754.firebasestorage.app/o/pwa%2FChatGPT%20Image%207%20de%20mai.%20de%202026%2C%2016_45_54.png?alt=media&token=c8100c94-fb27-4b1f-87b8-74bd1f8d3fe5" 
              alt="OikoApp Logo" 
              className="h-[60px] w-auto object-contain" 
            />
          </div>
        </SidebarHeader>
        <div className="flex-1 overflow-y-auto">
            <MenuItems pathname={pathname} permissions={permissions} userRole={userRole} onLinkClick={handleLinkClick} />
        </div>
      </SheetContent>
    </Sheet>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, auth, isUserLoading } = useFirebase();
  const router = useRouter();

  const { data: userData, isLoading: isUserDataLoading } = useDoc<{ hierarchy?: { role?: string }; }>(user ? `users/${user.uid}`: null);
  
  const userRole = userData?.hierarchy?.role;
  const { data: accessProfile, isLoading: isLoadingAccessProfile } = useDoc<AccessProfile>(
    userRole ? `access_profiles/${userRole}` : null
  );

  const isLoading = isUserLoading || isUserDataLoading || isLoadingAccessProfile;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);


  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
        router.push('/');
      }
    } catch (error) {
      console.error("Logout failed", error);
    }
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`;
    return name.substring(0, 2);
  };
  
  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-white">
        <img 
          src="https://firebasestorage.googleapis.com/v0/b/studio-1424813022-71754.firebasestorage.app/o/pwa%2Flogo_1772385880160.png?alt=media&token=9f992f3e-70cd-4a19-a67f-77d16369e81a" 
          alt="Carregando..." 
          className="h-16 w-16 animate-pulse" 
        />
      </div>
    );
  }
  
  if (user && !userData?.hierarchy?.role) {
    return <div className="p-4"><PendingAccess userName={user.displayName} onLogout={handleLogout} /></div>;
  }

  if (user) {
    const userRoleLabel = userRole ? userRoles[userRole] : 'Membro';

    return (
      <SidebarProvider>
        <div className="min-h-screen w-full flex bg-slate-50">
          {/* --- Desktop Sidebar --- */}
          <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:border-r lg:border-slate-200 bg-white">
            <SidebarHeader className="border-b border-slate-200">
              <div className="flex items-center justify-start px-6 h-20 w-full">
                <img 
                  src="https://firebasestorage.googleapis.com/v0/b/studio-1424813022-71754.firebasestorage.app/o/pwa%2FChatGPT%20Image%207%20de%20mai.%20de%202026%2C%2016_45_54.png?alt=media&token=c8100c94-fb27-4b1f-87b8-74bd1f8d3fe5" 
                  alt="OikoApp Logo" 
                  className="h-[60px] w-auto object-contain" 
                />
              </div>
            </SidebarHeader>
            <div className="flex-1 flex flex-col overflow-y-auto">
                <MenuItems pathname={pathname} permissions={accessProfile?.permissions} userRole={userRole} onLinkClick={() => {}} />
            </div>
             <SidebarFooter className="border-t border-slate-200">
                <div className="flex items-center gap-3 p-4">
                    <Avatar className="h-10 w-10 border-2 border-white">
                        {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User Avatar'} />}
                        <AvatarFallback className="font-bold text-slate-600 bg-slate-200">{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-sm truncate">
                        <span className="font-semibold truncate text-slate-800">{user.displayName || 'Usuário'}</span>
                        <span className="text-slate-500 text-xs truncate capitalize">{userRoleLabel}</span>
                    </div>
                     <Button variant="ghost" size="icon" onClick={handleLogout} className="ml-auto shrink-0">
                         <LogOut className="size-5" />
                     </Button>
                </div>
            </SidebarFooter>
          </aside>

          {/* --- Main Content --- */}
          <div className="flex-1 flex flex-col">
             <header className="flex h-16 items-center gap-4 border-b bg-white px-6 sticky top-0 z-30">
                <MobileMenu 
                    pathname={pathname} 
                    permissions={accessProfile?.permissions} 
                    userRole={userRole} 
                    onLinkClick={() => {}}
                >
                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 lg:hidden"
                        >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </MobileMenu>
                 <div className="flex-1 flex items-center">
                    <form className="hidden md:block w-full">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar em todo o sistema..."
                                className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
                            />
                        </div>
                    </form>
                    <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                        <Search className="h-5 w-5" />
                        <span className="sr-only">Buscar</span>
                    </Button>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Moon className="h-5 w-5" />
                </Button>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <Bell className="h-5 w-5" />
                            <span className="sr-only">Notificações</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Não há novas notificações.</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                            <Avatar className="h-10 w-10">
                                {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User Avatar'} />}
                                <AvatarFallback className="font-bold text-slate-600 bg-slate-200">{getInitials(user.displayName)}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link href="/dashboard/settings">Configurações</Link></DropdownMenuItem>
                        <DropdownMenuItem>Suporte</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>Sair</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>
             <main className="flex-1 p-4 md:p-6 bg-slate-50 overflow-y-auto">
                {children}
             </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-white">
      <img 
        src="https://firebasestorage.googleapis.com/v0/b/studio-1424813022-71754.firebasestorage.app/o/pwa%2Flogo_1772385880160.png?alt=media&token=9f992f3e-70cd-4a19-a67f-77d16369e81a" 
        alt="OikoApp" 
        className="h-16 w-16 animate-pulse" 
      />
    </div>
  );
}
