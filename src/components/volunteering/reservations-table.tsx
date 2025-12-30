'use client';
import React, { useState, useMemo } from 'react';
import { useVolunteering, type RoomReservation } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Loader2, MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreateReservationDialog } from './create-reservation-dialog';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';

export function ReservationsTable() {
    const { reservations, users, updateReservation, deleteReservation, isLoading } = useVolunteering();
    const [isFormOpen, setFormOpen] = useState(false);
    const [isDeleteOpen, setDeleteOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<RoomReservation | null>(null);

    const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
    
    const sortedReservations = useMemo(() => {
        if (!reservations) return [];
        return [...reservations].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    }, [reservations]);


    const handleEdit = (reservation: RoomReservation) => {
        setSelectedReservation(reservation);
        setFormOpen(true);
    };

    const handleDelete = (reservation: RoomReservation) => {
        setSelectedReservation(reservation);
        setDeleteOpen(true);
    };

    const confirmDelete = () => {
        if (selectedReservation) {
            deleteReservation(selectedReservation.id);
            setDeleteOpen(false);
            setSelectedReservation(null);
        }
    };
    
    const handleStatusChange = (reservationId: string, status: 'approved' | 'rejected') => {
        updateReservation(reservationId, { status });
    };

    const statusConfig = {
        pending: { label: "Pendente", icon: Clock, color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
        approved: { label: "Aprovado", icon: CheckCircle, color: "bg-green-100 text-green-800 border-green-300" },
        rejected: { label: "Rejeitado", icon: XCircle, color: "bg-red-100 text-red-800 border-red-300" },
    };

    const formatDateRange = (start, end) => {
        const startDate = start.toDate();
        const endDate = end.toDate();
        const startFormatted = format(startDate, "dd/MM/yy 'às' HH:mm");
        const endFormatted = format(endDate, "HH:mm");
        return `${startFormatted} - ${endFormatted}`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Evento</TableHead>
                            <TableHead>Sala</TableHead>
                            <TableHead>Período</TableHead>
                            <TableHead>Solicitante</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right w-16">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {sortedReservations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Nenhuma reserva solicitada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedReservations.map(res => {
                                const statusInfo = statusConfig[res.status];
                                const Icon = statusInfo.icon;
                                return (
                                    <TableRow key={res.id}>
                                        <TableCell className="font-medium">{res.eventName}</TableCell>
                                        <TableCell className="text-muted-foreground">{res.room}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{formatDateRange(res.startDateTime, res.endDateTime)}</TableCell>
                                        <TableCell className="text-muted-foreground">{userMap.get(res.requesterId) || 'Desconhecido'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`border ${statusInfo.color}`}>
                                                <Icon className="mr-1.5 h-3.5 w-3.5" />
                                                {statusInfo.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleStatusChange(res.id, 'approved')}><CheckCircle className="mr-2 h-4 w-4" /> Aprovar</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleStatusChange(res.id, 'rejected')}><XCircle className="mr-2 h-4 w-4" /> Rejeitar</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleEdit(res)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(res)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <CreateReservationDialog
                open={isFormOpen}
                onOpenChange={setFormOpen}
                existingReservation={selectedReservation}
            />
            
            {selectedReservation && (
                <DeleteConfirmationDialog
                    open={isDeleteOpen}
                    onOpenChange={setDeleteOpen}
                    onConfirm={confirmDelete}
                    itemName={selectedReservation.eventName}
                    itemType="Reserva"
                />
             )}
        </>
    );
}
