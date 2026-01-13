'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, List, Repeat, Tag, ScanLine } from 'lucide-react';
import { PatrimonyDashboardView } from '@/components/patrimony/dashboard-view';
import { InventoryView } from '@/components/patrimony/inventory-view';
import { UnderConstruction } from '@/components/common/under-construction';

const TABS = [
  { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventário', icon: List },
  { id: 'loans', label: 'Empréstimos', icon: Repeat },
  { id: 'labels', label: 'Etiquetas & Scan', icon: Tag },
];

export default function PatrimonyPage() {
    const [activeTab, setActiveTab] = useState('dashboard');

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ScanLine className="size-6 text-primary"/>
                    O Bom Mordomo - Gestão Patrimonial
                </CardTitle>
                <CardDescription>
                    Gerencie o inventário, os empréstimos e a saúde dos ativos da igreja em um só lugar.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        {TABS.map(tab => (
                             <TabsTrigger key={tab.id} value={tab.id}>
                                <tab.icon className="mr-2 size-4" />
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    
                    <TabsContent value="dashboard" className="mt-6">
                        <PatrimonyDashboardView />
                    </TabsContent>
                    
                    <TabsContent value="inventory" className="mt-6">
                        <InventoryView />
                    </TabsContent>

                    <TabsContent value="loans" className="mt-6">
                        <UnderConstruction 
                            pageTitle="Controle de Empréstimos"
                            pageDescription="Gerencie o check-in e check-out de equipamentos para eventos e ministérios."
                        />
                    </TabsContent>

                     <TabsContent value="labels" className="mt-6">
                        <UnderConstruction 
                            pageTitle="Etiquetas e Scanner"
                            pageDescription="Gere etiquetas com QR Code para seus ativos e utilize o scanner para auditorias rápidas."
                        />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}