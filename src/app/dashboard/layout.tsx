"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Building,
  FileText,
  Settings,
  User,
  LogOut,
  PlusCircle,
  CalendarCheck,
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
import { Logo } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/members", label: "Membros", icon: Users },
    { href: "/dashboard/cells", label: "Células", icon: Building },
    { href: "/dashboard/attendance", label: "Presença", icon: CalendarCheck },
    { href: "/dashboard/reports", label: "Relatórios", icon: FileText },
  ];

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
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    className="justify-start"
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
             <SidebarMenuItem>
                <Link href="/leader/new-member" legacyBehavior passHref>
                  <SidebarMenuButton
                    isActive={pathname === "/leader/new-member"}
                    className="justify-start bg-accent/50 text-accent-foreground/80 hover:bg-accent hover:text-accent-foreground"
                  >
                    <PlusCircle className="size-4" />
                    <span>Novo Membro (Líder)</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
             <SidebarMenuItem>
                <Link href="/dashboard/settings" legacyBehavior passHref>
                  <SidebarMenuButton isActive={pathname === '/dashboard/settings'} className="justify-start">
                    <Settings className="size-4" />
                    <span>Configurações</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 p-2 rounded-md">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://picsum.photos/seed/supervisor/40/40" />
                  <AvatarFallback>SV</AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-sm">
                  <span className="font-semibold">Supervisor</span>
                  <span className="text-muted-foreground text-xs">pastor@email.com</span>
                </div>
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
               <Link href="/" legacyBehavior passHref>
                <SidebarMenuButton className="justify-start">
                    <LogOut className="size-4" />
                    <span>Sair</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur-sm sticky top-0 z-30">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1">
                <h1 className="text-lg font-semibold font-headline">
                    {menuItems.find(item => item.href === pathname)?.label || "ConectarGC"}
                </h1>
            </div>
            <Button size="sm">Hoje</Button>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
