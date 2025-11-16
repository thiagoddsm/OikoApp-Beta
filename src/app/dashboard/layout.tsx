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
  Loader2,
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
import { useFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, auth, isUserLoading } = useFirebase();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/members", label: "Membros", icon: Users },
    { href: "/dashboard/cells", label: "Células", icon: Building },
    { href: "/dashboard/attendance", label: "Presença", icon: CalendarCheck },
    { href: "/dashboard/reports", label: "Relatórios", icon: FileText },
  ];
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2);
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
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  className="justify-start"
                >
                  <Link href={item.href}>
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
             <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/leader/new-member"}
                  className="justify-start bg-accent/50 text-accent-foreground/80 hover:bg-accent hover:text-accent-foreground"
                >
                  <Link href="/leader/new-member">
                    <PlusCircle className="size-4" />
                    <span>Novo Membro (Líder)</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                    {menuItems.find(item => pathname.startsWith(item.href) && item.href !== '/dashboard')?.label || (pathname === '/dashboard' ? 'Dashboard' : (pathname.includes('/members/') ? 'Perfil do Membro' : 'ConectarGC'))}
                </h1>
            </div>
            <Button size="sm">Hoje</Button>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
