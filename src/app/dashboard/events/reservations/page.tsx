'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { CalendarClock, PlusCircle, Search, Filter, X } from 'lucide-react';
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
    const { rooms, reservationCategories } = useVolunteering();
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<any>(null);
    
    // Estados de Filtro
    const [searchTerm, setSearchTerm] = useState('');
    const [roomFilter, setRoomFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

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
        setCategoryFilter('all');
    };

    const hasActiveFilters = searchTerm !== '' || roomFilter !== 'all' || categoryFilter !== 'all';

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
                        Nova Reserva
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

                        <div className="w-[180px] space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Categoria</label>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Todas Categorias" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas Categorias</SelectItem>
                                    {reservationCategories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
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
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="calendar">Calendário</TabsTrigger>
                            <TabsTrigger value="list">Lista de Solicitações</TabsTrigger>
                            <TabsTrigger value="rooms">Ambientes</TabsTrigger>
                            <TabsTrigger value="categories">Categorias</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="calendar" className="mt-4">
                            <ReservationsCalendar 
                                onEventClick={handleEventClick} 
                                searchTerm={searchTerm}
                                roomFilter={roomFilter}
                                categoryFilter={categoryFilter}
                            />
                        </TabsContent>
                        
                        <TabsContent value="list" className="mt-4">
                            <ReservationsTable 
                                searchTerm={searchTerm}
                                roomFilter={roomFilter}
                                categoryFilter={categoryFilter}
                            />
                        </TabsContent>
                        
                        <TabsContent value="rooms" className="mt-4">
                            <RoomsManagement />
                        </TabsContent>
                        
                        <TabsContent value="categories" className="mt-4">
                            <CategoryManagement />
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
