
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect } from 'react';
import {
  Home,
  Users,
  Settings,
  User,
  LogOut,
  PlusCircle,
  BarChart2,
  Network,
  ChevronDown,
  Building,
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
  MessageSquare,
  Footprints,
  FileText,
  Waves,
  HandHelping,
  Shield,
  CalendarClock,
  Save,
  LayoutTemplate,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Logo } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirebase, useDoc } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { PendingAccess } from "@/components/auth/pending-access";


export const userRoles: { [key: string]: string } = {
  'admin': 'Admin',
  'pastor_senior': 'Pastor Sênior',
  'pastor': 'Pastor',
  'lider_rede': 'Líder de Rede',
  'lider_area': 'Líder de Área',
  'gc_leader': 'Líder de GC',
  'team_leader': 'Líder de Equipe',
  'member': 'Membro',
  'volunteer': 'Voluntário'
};

const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { 
      label: "Pessoas", 
      icon: Users,
      subItems: [
        { href: "/dashboard/people/journey", label: "Integração", icon: Footprints },
        { href: "/dashboard/people/list", label: "Lista de Pessoas", icon: Users2 },
      ]
    },
    { 
      label: "GCs", 
      icon: HeartHandshake,
      subItems: [
        { href: "/dashboard/gc/structure", label: "Estrutura", icon: Network },
        { href: "/dashboard/gc/cells", label: "Células", icon: Building },
        { href: "/dashboard/gc/report", label: "Relatório de Célula", icon: ClipboardList },
        { href: "/dashboard/gc/map", label: "Mapa", icon: Map },
      ]
    },
    {
      label: "Serviço",
      icon: HandHelping,
      subItems: [
        { href: "/dashboard/volunteering", label: "Áreas de Serviço", icon: HandHelping },
        { href: "/dashboard/volunteering/teams", label: "Equipes", icon: Shield },
        { href: "/dashboard/volunteering/events", label: "Gerenciar Eventos", icon: CalendarPlus },
        { href: "/dashboard/volunteering/schedule", label: "Gerar Escala", icon: CalendarCog },
        { href: "/dashboard/volunteering/saved-schedules", label: "Escalas Salvas", icon: Save },
      ]
    },
    { 
      label: "Ministerial", 
      icon: Church,
      subItems: [
        { href: "/dashboard/attendance", label: "Frequência (Culto)", icon: CheckSquare },
        { 
            label: "Ensino", 
            icon: GraduationCap,
            subItems: [
              { href: "/dashboard/teaching/courses", label: "Cursos e Turmas", icon: BookOpen },
              { href: "/dashboard/teaching/teachers", label: "Professores", icon: UserCheckIcon },
              { href: "/dashboard/teaching/students", label: "Alunos", icon: Users2 },
              { href: "/dashboard/teaching/wave", label: "Wave - Escola de Música", icon: Waves },
            ]
        },
        { 
            label: "Eventos", 
            icon: CalendarDays,
            subItems: [
              { href: "/dashboard/events", label: "Cultos e Eventos", icon: CalendarCheck },
              { href: "/dashboard/events/planning", label: "Planejamento de Evento", icon: LayoutTemplate },
              { href: "/dashboard/briefing-pro", label: "Briefing Pro", icon: FileText },
              { href: "/dashboard/events/reservations", label: "Reservas de Sala", icon: CalendarClock },
            ]
        },
        { href: "/dashboard/finance", label: "Financeiro", icon: Briefcase },
        { href: "/dashboard/patrimony", label: "Patrimônio", icon: ScanLine },
        { href: "/dashboard/social", label: "Ação Social", icon: Users },
        { href: "/dashboard/goals", label: "Metas (KPIs)", icon: TrendingUp },
        { href: "/dashboard/ai-agent", label: "Agente IA", icon: Bot },
        { href: "/dashboard/notifications", label: "Notificações", icon: Send },
      ]
    },
    // Temporary item for data import
    { href: "/dashboard/import-data", label: "Importar Dados", icon: Upload },
];

function renderMenuItems(items: any[], pathname: string, level = 0) {
  return items.map((item) => {
    const isCollapsibleOpen = item.subItems?.some(sub => sub.href && pathname.startsWith(sub.href)) || item.subItems?.some(sub => sub.subItems?.some(subsub => subsub.href && pathname.startsWith(subsub.href)));
    
    if (item.subItems) {
      return (
        <Collapsible key={item.label} className="w-full" defaultOpen={isCollapsibleOpen}>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild className="w-full">
              <SidebarMenuButton className="justify-between w-full" isActive={isCollapsibleOpen}>
                  <div className="flex items-center gap-2">
                    {item.icon && <item.icon className="size-4" />}
                    <span>{item.label}</span>
                  </div>
                  <ChevronDown className="size-4 transition-transform [&[data-state=open]]:rotate-180" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
          </SidebarMenuItem>
          <CollapsibleContent>
            <SidebarMenu className={cn(level > 0 ? "pl-6" : "pl-6")}>
              {renderMenuItems(item.subItems, pathname, level + 1)}
            </SidebarMenu>
          </CollapsibleContent>
        </Collapsible>
      );
    }
    
    if (item.href) {
      return (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} className="justify-start">
            <Link href={item.href}>
              {item.icon && <item.icon className="size-4" />}
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }
    return null;
  });
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
  
  const isLoading = isUserLoading || isUserDataLoading;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
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
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2);
  };

  const getPageTitle = (path: string) => {
      // This is a simple implementation. For a more robust solution,
      // you might want to traverse the menuItems array recursively.
      if (path === '/dashboard') return 'Dashboard';
      if (path.startsWith('/dashboard/people')) return 'Pessoas';
      if (path.startsWith('/dashboard/gc')) return 'GCs e Discipulado';
      if (path.startsWith('/dashboard/discipleship')) return 'Discipulado';
      if (path.startsWith('/dashboard/attendance')) return 'Frequência nos Cultos';
      if (path.startsWith('/dashboard/volunteering/teams')) return 'Gerenciar Equipes';
      if (path.startsWith('/dashboard/volunteering/events')) return 'Gerenciar Eventos';
      if (path.startsWith('/dashboard/volunteering/schedule')) return 'Geração de Escalas';
      if (path.startsWith('/dashboard/volunteering/saved-schedules')) return 'Escalas Salvas';
      if (path.startsWith('/dashboard/volunteering')) return 'Gerenciar Áreas de Serviço';
      if (path.startsWith('/dashboard/teaching/wave')) return 'Wave - Escola de Música';
      if (path.startsWith('/dashboard/teaching')) return 'Ensino';
      if (path.startsWith('/dashboard/briefing-pro')) return 'Briefing Pro';
      if (path.startsWith('/dashboard/events/reservations')) return 'Reservas de Sala';
      if (path.startsWith('/dashboard/events/planning')) return 'Planejamento de Evento';
      if (path.startsWith('/dashboard/events')) return 'Eventos e Produção';
      if (path.startsWith('/dashboard/patrimony')) return 'Gestão de Patrimônio';
      if (path.startsWith('/dashboard/social')) return 'Ação Social';
      if (path.startsWith('/dashboard/goals')) return 'Metas e KPIs';
      if (path.startsWith('/dashboard/ai-agent')) return 'Agente IA';
      if (path.startsWith('/dashboard/import-data')) return 'Importação de Dados';
      if (path.startsWith('/dashboard/notifications')) return 'Central de Notificações';
      if (path.startsWith('/dashboard/finance')) return 'Gestão Financeira';
        
      return 'OikoApp';
  };
  
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Logo className="h-12 w-12 animate-pulse text-primary" />
      </div>
    );
  }
  
  const userRole = userData?.hierarchy?.role;
  const hasAccess = !!userRole;


  if (user && !hasAccess) {
    return <PendingAccess userName={user.displayName} onLogout={handleLogout} />;
  }

  if (user && hasAccess) {
    const userRoleLabel = userRoles[userRole] || 'Membro';

    return (
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <Logo className="size-7 text-primary" />
              <span className="text-lg font-semibold">OikoApp</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {renderMenuItems(menuItems, pathname)}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/dashboard/settings'} className="justify-start">
                    <Link href="/dashboard/settings">
                      <Settings className="size-4" />
                      <span>Configurações</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              <SidebarMenuItem>
                <div className="flex items-center gap-2 p-2 rounded-md">
                    <Avatar className="h-8 w-8">
                      {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User Avatar'} />}
                      <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-sm truncate">
                      <span className="font-semibold truncate">{user.displayName || 'Usuário'}</span>
                      <span className="text-muted-foreground text-xs truncate">{user.email || 'Sem email'}</span>
                      {userRoleLabel && <span className="text-muted-foreground text-xs truncate font-bold capitalize">{userRoleLabel}</span>}
                    </div>
                  </div>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="justify-start w-full">
                    <LogOut className="size-4" />
                    <span>Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur-sm sticky top-0 z-30">
              <SidebarTrigger className="md:hidden" />
              <div className="flex-1">
                  <h1 className="text-lg font-semibold">
                      {getPageTitle(pathname)}
                  </h1>
              </div>
              <Button size="sm">Hoje</Button>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
      <div className="flex h-screen w-full items-center justify-center">
        <Logo className="h-12 w-12 animate-pulse text-primary" />
      </div>
  );
}
