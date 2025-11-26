
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from 'react';
import {
  Home,
  Users,
  FileText,
  Settings,
  User,
  LogOut,
  PlusCircle,
  CalendarCheck,
  Loader2,
  BarChart2,
  Network,
  ChevronDown,
  Building,
  ClipboardList
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
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export const userRoles: { [key: string]: string } = {
  'admin': 'Admin',
  'pastor_senior': 'Pastor Senior',
  'lider_rede': 'Líder de Rede',
  'lider_area': 'Líder de Área',
  'lider_gc': 'Líder de GC',
  'membro': 'Membro'
};

const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/users", label: "Usuários", icon: Users },
    { 
      label: "GC", 
      icon: Network,
      subItems: [
        { href: "/dashboard/gc/structure", label: "Estrutura", icon: Network },
        { href: "/dashboard/gc/cells", label: "Células", icon: Building },
        { href: "/dashboard/gc/report", label: "Relatório de Célula", icon: ClipboardList },
      ]
    },
    { href: "/dashboard/attendance", label: "Presença Culto", icon: CalendarCheck },
    { href: "/dashboard/reports", label: "Análises", icon: BarChart2 },
    { href: "/dashboard/new-member", label: "Novo Visitante", icon: PlusCircle },
];


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, auth, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  
  const { data: userData } = useDoc<{ hierarchy?: { role?: string; } }>(userDocRef);
  const userRole = userData?.hierarchy?.role;
  const userRoleLabel = userRole ? userRoles[userRole] : 'Carregando...';

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
      if (path.startsWith('/dashboard/users/')) return 'Perfil do Usuário';
      if (path.startsWith('/dashboard/users')) return 'Usuários';
      if (path.startsWith('/dashboard/gc/cells')) return 'Células';
      if (path.startsWith('/dashboard/gc/report')) return 'Relatório de Célula';
      if (path.startsWith('/dashboard/gc')) return 'Estrutura de GC';
      if (path.startsWith('/dashboard/attendance')) return 'Presença Culto';
      if (path.startsWith('/dashboard/reports')) return 'Análises';
      if (path.startsWith('/dashboard/new-member')) return 'Novo Visitante';

      const defaultTitle = menuItems
        .flatMap(item => item.subItems ? item.subItems : [item])
        .find(item => path.startsWith(item.href))?.label;
        
      return defaultTitle || 'ConectarGC';
  };


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="size-7 text-primary" />
            <span className="text-lg font-semibold font-headline">ConectarGC</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
             {menuItems.map((item) => 
              item.subItems ? (
                <Collapsible key={item.label} className="w-full" defaultOpen={pathname.startsWith('/dashboard/gc')}>
                  <SidebarMenuItem className="w-full">
                     <CollapsibleTrigger className="w-full">
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
              {isUserLoading ? (
                 <div className="flex items-center gap-2 p-2 rounded-md">
                  <Loader2 className="h-8 w-8 animate-spin" />
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
                 <div className="flex items-center gap-2 p-2 rounded-md">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>??</AvatarFallback>
                    </Avatar>
                     <div className="flex flex-col text-sm">
                        <span className="font-semibold">Não conectado</span>
                    </div>
                  </div>
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
                <h1 className="text-lg font-semibold font-headline">
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
