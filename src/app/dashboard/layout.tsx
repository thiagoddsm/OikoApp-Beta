
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
  CalendarCheck
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
  'pastor': 'Pastor',
  'gc_leader': 'Líder de GC',
  'team_leader': 'Líder de Equipe',
  'member': 'Membro',
  'volunteer': 'Voluntário'
};

const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/users", label: "Pessoas (CRM)", icon: Users },
    { 
      label: "GCs & Discipulado", 
      icon: Network,
      subItems: [
        { href: "/dashboard/gc/structure", label: "Estrutura", icon: Network },
        { href: "/dashboard/gc/cells", label: "Células", icon: Building },
        { href: "/dashboard/gc/report", label: "Relatório de Célula", icon: ClipboardList },
        { href: "/dashboard/gc/map", label: "Mapa", icon: Map },
      ]
    },
    { href: "/dashboard/volunteering", label: "Voluntariado", icon: HeartHandshake },
    { href: "/dashboard/events", label: "Eventos", icon: CalendarDays },
    { href: "/dashboard/social", label: "Ação Social", icon: Users },
    { href: "/dashboard/goals", label: "Metas (KPIs)", icon: TrendingUp },
];


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, auth, isUserLoading } = useFirebase();
  const router = useRouter();

  const { data: userData, isLoading: isUserDataLoading } = useDoc<{ roles?: string[]; }>(user ? `users/${user.uid}`: null);
  
  const userRolesList = userData?.roles || [];
  const userPrimaryRole = userRolesList[0] || 'member';
  const userRoleLabel = userRoles[userPrimaryRole] || 'Membro';
  
  // Check if the user has admin-like privileges
  const hasAccess = userRolesList.includes('admin') || userRolesList.includes('pastor');

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [isUserLoading, user, router]);


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
      if (path === '/dashboard') return 'Dashboard';
      if (path.startsWith('/dashboard/users')) return 'Pessoas e Jornada';
      if (path.startsWith('/dashboard/gc')) return 'GCs e Discipulado';
      if (path.startsWith('/dashboard/volunteering')) return 'Voluntariado e Escalas';
      if (path.startsWith('/dashboard/events')) return 'Eventos e Produção';
      if (path.startsWith('/dashboard/social')) return 'Ação Social';
      if (path.startsWith('/dashboard/goals')) return 'Metas e KPIs';

      const defaultTitle = menuItems
        .flatMap(item => item.subItems ? item.subItems : [item])
        .find(item => path.startsWith(item.href))?.label;
        
      return defaultTitle || 'OikoApp';
  };
  
  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Logo className="h-12 w-12 animate-pulse text-primary" />
      </div>
    );
  }
  
  if (!hasAccess) {
    return <PendingAccess userName={user.displayName} onLogout={handleLogout} />;
  }


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
             {menuItems.map((item) => 
              item.subItems ? (
                <Collapsible key={item.label} className="w-full" defaultOpen={pathname.startsWith('/dashboard/gc')}>
                  <SidebarMenuItem>
                     <CollapsibleTrigger asChild className="w-full">
                       <SidebarMenuButton className="justify-between w-full" isActive={pathname.startsWith('/dashboard/gc')}>
                          <div className="flex items-center gap-2">
                            <item.icon className="size-4" />
                            <span>{item.label}</span>
                          </div>
                          <ChevronDown className="size-4 transition-transform [&[data-state=open]]:rotate-180" />
                       </SidebarMenuButton>
                     </CollapsibleTrigger>
                  </SidebarMenuItem>
                  <CollapsibleContent>
                    <SidebarMenu className="pl-6">
                      {item.subItems.map(subItem => (
                         <SidebarMenuItem key={subItem.href}>
                            <SidebarMenuButton asChild isActive={pathname === subItem.href} className="justify-start h-8">
                              <Link href={subItem.href}>
                                <subItem.icon className="size-4" />
                                <span>{subItem.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} className="justify-start">
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            )}
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
              {isLoading ? (
                 <div className="flex items-center gap-2 p-2 rounded-md">
                   <Avatar className="h-8 w-8 bg-muted animate-pulse" />
                   <div className="flex flex-col gap-1">
                      <div className="h-3 w-20 bg-muted animate-pulse rounded"/>
                      <div className="h-3 w-12 bg-muted animate-pulse rounded"/>
                   </div>
                 </div>
              ) : user ? (
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
              ) : (
                 <div />
              )}
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
