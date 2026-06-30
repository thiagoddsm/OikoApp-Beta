'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { CalendarClock, PlusCircle, Search, X, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateReservationDialog } from '@/components/volunteering/create-reservation-dialog';
import { ReservationsTable } from '@/components/volunteering/reservations-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoomsManagement } from '@/components/volunteering/rooms-management';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryManagement } from '@/components/volunteering/category-management';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEventsData } from "@/hooks/useDomainData";
import { MinistryManagement } from '@/components/volunteering/ministry-management';

const ReservationsCalendar = dynamic(
    () => import('@/components/volunteering/reservations-calendar').then(mod => mod.ReservationsCalendar),
    { 
        ssr: false,
        loading: () => (
             <div className="flex items-center justify-center p-8 h-[70vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }
);

function ReservationsPageContent() {
    const { events, reservations, rooms, strategicEvents, reservationCategories, ministries } = useEventsData();

    const [isDialogOpen, setDialogOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<any>(null);
    
    // Estados de Filtro
    const [searchTerm, setSearchTerm] = useState('');
    const [roomFilter, setRoomFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState<string[]>([]); // [] = todas
    const [ministryFilter, setMinistryFilter] = useState('all');

    const staticCategories = [
        { id: 'regular', name: 'Regular' },
        { id: 'eventual', name: 'Eventual' }
    ];

    const handleNewReservation = () => {
        setSelectedReservation(null);
        setDialogOpen(true);
    };

    const handleEventClick = (res: any) => {
        setSelectedReservation(res);
        setDialogOpen(true);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setRoomFilter('all');
        setCategoryFilter([]);
        setMinistryFilter('all');
    };

    const toggleCategory = (catId: string) => {
        setCategoryFilter(prev =>
            prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
        );
    };

    const hasActiveFilters = searchTerm !== '' || roomFilter !== 'all' || categoryFilter.length > 0 || ministryFilter !== 'all';

    const categoryLabel = categoryFilter.length === 0
        ? 'Todas Categorias'
        : categoryFilter.length === 1
            ? staticCategories.find(c => c.id === categoryFilter[0])?.name ?? '1 categoria'
            : `${categoryFilter.length} categorias`;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-3">
                            <CalendarClock className="size-6 text-primary"/>
                            Calendário Geral
                        </CardTitle>
                        <CardDescription>
                            Gerencie as solicitações, o calendário e os ambientes disponíveis para reserva.
                        </CardDescription>
                    </div>
                    <Button onClick={handleNewReservation}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Criar Evento/Agendamento
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Barra de Filtros */}
                    <div className="flex flex-wrap items-end gap-4 mb-6 p-4 border rounded-lg bg-muted/30">
                        <div className="flex-1 min-w-[200px] space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Pesquisar</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Nome do evento..." 
                                    className="pl-8 bg-background"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="w-[200px] space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Ambiente</label>
                            <Select value={roomFilter} onValueChange={setRoomFilter}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Todos Ambientes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos Ambientes</SelectItem>
                                    {rooms.map(room => (
                                        <SelectItem key={room.id} value={room.name}>{room.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Filtro de Categorias — Multi-select com checkboxes */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Categorias</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "bg-background min-w-[180px] justify-between font-normal",
                                            categoryFilter.length > 0 && "border-primary text-primary"
                                        )}
                                    >
                                        <span className="truncate">{categoryLabel}</span>
                                        <div className="flex items-center gap-1 ml-2 shrink-0">
                                            {categoryFilter.length > 0 && (
                                                <Badge className="h-5 px-1.5 text-[10px] font-black">
                                                    {categoryFilter.length}
                                                </Badge>
                                            )}
                                            <ChevronDown className="h-4 w-4 opacity-50" />
                                        </div>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-2" align="start">
                                    <div className="space-y-1">
                                        {/* Opção "Todas" */}
                                        <button
                                            type="button"
                                            onClick={() => setCategoryFilter([])}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors",
                                                categoryFilter.length === 0 && "font-bold text-primary bg-primary/5"
                                            )}
                                        >
                                            <Check className={cn("h-4 w-4", categoryFilter.length !== 0 && "opacity-0")} />
                                            Todas as Categorias
                                        </button>

                                        <div className="border-t my-1" />

                                        {staticCategories.map(cat => (
                                            <label
                                                key={cat.id}
                                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors"
                                            >
                                                <Checkbox
                                                    checked={categoryFilter.includes(cat.id)}
                                                    onCheckedChange={() => toggleCategory(cat.id)}
                                                    id={`cat-${cat.id}`}
                                                />
                                                <span className="text-sm">{cat.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="w-[180px] space-y-1.5">
                             <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Ministério</label>
                             <Select value={ministryFilter} onValueChange={setMinistryFilter}>
                                 <SelectTrigger className="bg-background">
                                     <SelectValue placeholder="Todos Ministérios" />
                                 </SelectTrigger>
                                 <SelectContent>
                                     <SelectItem value="all">Todos Ministérios</SelectItem>
                                     <SelectItem value="geral">Geral / Outro</SelectItem>
                                     {ministries.map((min: any) => (
                                         <SelectItem key={min.id} value={min.id}>{min.name}</SelectItem>
                                     ))}
                                 </SelectContent>
                             </Select>
                        </div>

                        {hasActiveFilters && (
                            <Button variant="ghost" size="icon" onClick={handleClearFilters} className="h-10 w-10 text-muted-foreground hover:text-destructive" title="Limpar Filtros">
                                <X className="size-4" />
                            </Button>
                        )}
                    </div>


                    <Tabs defaultValue="calendar">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-1">
                            <TabsTrigger value="calendar">Calendário</TabsTrigger>
                            <TabsTrigger value="list">Lista de Solicitações</TabsTrigger>
                            <TabsTrigger value="rooms">Ambientes</TabsTrigger>
                            <TabsTrigger value="ministries">Ministérios</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="calendar" className="mt-4">
                            <ReservationsCalendar 
                                onEventClick={handleEventClick} 
                                searchTerm={searchTerm}
                                roomFilter={roomFilter}
                                categoryFilter={categoryFilter}
                                ministryFilter={ministryFilter}
                            />
                        </TabsContent>
                        
                        <TabsContent value="list" className="mt-4">
                            <ReservationsTable 
                                searchTerm={searchTerm}
                                roomFilter={roomFilter}
                                categoryFilter={categoryFilter}
                                ministryFilter={ministryFilter}
                            />
                        </TabsContent>
                        
                        <TabsContent value="rooms" className="mt-4">
                            <RoomsManagement />
                        </TabsContent>

                        <TabsContent value="ministries" className="mt-4">
                            <MinistryManagement />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <CreateReservationDialog 
                open={isDialogOpen} 
                onOpenChange={setDialogOpen} 
                existingReservation={selectedReservation} 
            />
        </div>
    );
}

export default function ReservationsPage() {
    return (
        <VolunteeringProvider>
            <ReservationsPageContent />
        </VolunteeringProvider>
    );
}
