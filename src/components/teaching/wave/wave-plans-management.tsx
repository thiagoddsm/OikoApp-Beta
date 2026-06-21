
'use client';
import React, { useState } from 'react';
import { useVolunteering, type WavePlan } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { PlanFormDialog } from './plan-form-dialog';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useTeachingFinance } from "@/hooks/useDomainData";

export function WavePlansManagement() {
    const { wavePayments, disPayments, wavePlans, disPlans, waveExpenses } = useTeachingFinance();

  const { isLoading, deleteWavePlan } = useVolunteering();
  const [isFormOpen, setFormOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<WavePlan | null>(null);

  const handleEdit = (plan: WavePlan) => {
    setSelectedPlan(plan);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedPlan(null);
    setFormOpen(true);
  };
  
  const handleDelete = (plan: WavePlan) => {
    setSelectedPlan(plan);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedPlan) {
      deleteWavePlan(selectedPlan.id);
      setDeleteOpen(false);
      setSelectedPlan(null);
    }
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
      <Card>
        <CardHeader className="flex-row justify-between items-center">
            <div>
                <CardTitle>Planos de Mensalidade</CardTitle>
                <CardDescription>Gerencie os planos de pagamento da escola de música.</CardDescription>
            </div>
             <Button onClick={handleAdd} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Plano
            </Button>
        </CardHeader>
        <CardContent>
            <div className="rounded-lg border">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Nome do Plano</TableHead>
                    <TableHead className="w-[150px]">Preço Mensal</TableHead>
                    <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {wavePlans.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                Nenhum plano cadastrado.
                            </TableCell>
                        </TableRow>
                    ) : (
                        wavePlans.map((plan) => (
                        <TableRow key={plan.id}>
                            <TableCell className="font-medium">{plan.name}</TableCell>
                            <TableCell>R$ {plan.price.toFixed(2).replace('.', ',')}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(plan)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                        </TableRow>
                        ))
                    )}
                </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      <PlanFormDialog
        open={isFormOpen}
        onOpenChange={setFormOpen}
        existingPlan={selectedPlan}
      />
      
      {selectedPlan && (
        <DeleteConfirmationDialog
            open={isDeleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={confirmDelete}
            itemName={selectedPlan.name}
            itemType="Plano"
        />
      )}
    </>
  );
}
