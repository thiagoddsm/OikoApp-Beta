
'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { useCollection, useDoc } from '@/firebase/firestore';
import { collection, query, where, doc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileText, Users, UserPlus, HeartHandshake, BookOpen, CircleDollarSign, AlertTriangle, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type Cell = { id: string; nome: string; membros: string[] };
type Member = { id: string; name: string; avatar?: string };

const getAppId = () => (typeof window !== 'undefined' && (window as any).__app_id) ? (window as any).__app_id : 'default-app-id';

function CellReportForm({ cell, members, leaderId }: { cell: Cell; members: Member[], leaderId: string }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [presentMembers, setPresentMembers] = useState<string[]>([]);
    const [visitantes, setVisitantes] = useState('');
    const [conversoes, setConversoes] = useState(0);
    const [licaoMinistrada, setLicaoMinistrada] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [oferta, setOferta] = useState(0);

    const handleMemberToggle = (memberId: string) => {
        setPresentMembers(prev =>
            prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const appId = getAppId();
        const reportCollection = collection(firestore, `attendance_reports`);

        try {
            await addDocumentNonBlocking(reportCollection, {
                cellId: cell.id,
                date: Timestamp.now(),
                presentMembers,
                visitantes,
                conversoes,
                qualitative: {
                    licaoMinistrada,
                    decisoes: '', // Campo do schema, pode ser usado no futuro
                    obs: observacoes
                },
                financials: { // Mapeando para um futuro schema de finanças
                    oferta: oferta
                },
                leaderId: leaderId,
                kidsSecurity: {}, // Placeholder
                createdAt: Timestamp.now()
            });

            toast({
                title: "Relatório Enviado!",
                description: "Obrigado por sua dedicação, líder!",
            });
            // Reset form
            setPresentMembers([]);
            setVisitantes('');
            setConversoes(0);
            setLicaoMinistrada('');
            setObservacoes('');
            setOferta(0);

        } catch (error) {
            console.error("Error submitting report: ", error);
            toast({
                variant: 'destructive',
                title: "Erro ao Enviar",
                description: "Não foi possível salvar o relatório. Tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Presença */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="size-5 text-primary" />Presença</CardTitle>
                    <CardDescription>Marque os membros que estiveram presentes na reunião.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {members.map(member => {
                        const avatar = PlaceHolderImages.find(p => p.id === (member.avatar || 'avatar-1'));
                        return (
                            <div key={member.id} className="flex flex-col items-center gap-2">
                                <label htmlFor={`member-${member.id}`} className="cursor-pointer">
                                    <Avatar className={`h-16 w-16 border-2 transition-all ${presentMembers.includes(member.id) ? 'border-primary' : 'border-transparent'}`}>
                                        {avatar && <AvatarImage src={avatar.imageUrl} alt={avatar.description} />}
                                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </label>
                                <div className="flex items-center gap-2">
                                    <Checkbox id={`member-${member.id}`} checked={presentMembers.includes(member.id)} onCheckedChange={() => handleMemberToggle(member.id)} />
                                    <span className="text-sm font-medium text-center">{member.name}</span>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* 2. Visitantes */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserPlus className="size-5 text-primary" />Visitantes</CardTitle>
                    <CardDescription>Adicione os nomes dos visitantes, separados por vírgula.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea placeholder="Ex: Maria, José, Ana" value={visitantes} onChange={(e) => setVisitantes(e.target.value)} />
                </CardContent>
            </Card>
            
            {/* 3. Conversões */}
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><HeartHandshake className="size-5 text-primary" />Conversões</CardTitle>
                    <CardDescription>Quantas pessoas tomaram uma decisão por Cristo?</CardDescription>
                </CardHeader>
                <CardContent>
                    <Input type="number" min="0" value={conversoes} onChange={(e) => setConversoes(Number(e.target.value))} placeholder="0" />
                </CardContent>
            </Card>

            {/* 4. Resumo */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookOpen className="size-5 text-primary" />Resumo da Reunião</CardTitle>
                    <CardDescription>Compartilhe o que foi ministrado e outras observações.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <Label htmlFor="licao">Lição Ministrada</Label>
                        <Input id="licao" value={licaoMinistrada} onChange={(e) => setLicaoMinistrada(e.target.value)} placeholder="Ex: Lição 5 - Oração" />
                    </div>
                    <div>
                        <Label htmlFor="obs">Observações Importantes</Label>
                        <Textarea id="obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Pedidos de oração, testemunhos, dificuldades, etc." />
                    </div>
                </CardContent>
            </Card>

            {/* 5. Oferta */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CircleDollarSign className="size-5 text-primary" />Oferta da Célula</CardTitle>
                    <CardDescription>Registre o valor total da oferta recolhida na célula (R$).</CardDescription>
                </CardHeader>
                <CardContent>
                    <Input type="number" min="0" step="0.01" value={oferta} onChange={(e) => setOferta(Number(e.target.value))} placeholder="0.00" />
                </CardContent>
            </Card>

            <div className="text-center">
                <Button type="submit" size="lg" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Relatório Semanal
                </Button>
            </div>
        </form>
    );
}


export default function CellReportPage() {
    const { firestore, user, isUserLoading } = useFirebase();
    
    // Encontrar a célula liderada pelo usuário logado
    const leaderCellQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'cells'), where('liderId', '==', user.uid));
    }, [firestore, user]);

    const { data: cells, isLoading: isLoadingCells } = useCollection<Cell>(leaderCellQuery);
    const cell = cells?.[0];

    // Buscar os detalhes dos membros da célula encontrada
    const memberDetailsQuery = useMemoFirebase(() => {
        if (!firestore || !cell || cell.membros.length === 0) return null;
        return query(collection(firestore, 'users'), where('__name__', 'in', cell.membros));
    }, [firestore, cell]);

    const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(memberDetailsQuery);

    const isLoading = isUserLoading || isLoadingCells || isLoadingMembers;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Carregando dados da sua célula...</p>
            </div>
        );
    }
    
    if (!cell) {
        return (
             <Card className="w-full max-w-lg mx-auto">
                 <CardHeader className="text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                    <CardTitle className="mt-4">Nenhuma Célula Encontrada</CardTitle>
                 </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground">
                        Você não está registrado como líder de nenhuma célula. Por favor, entre em contato com seu supervisor para ser adicionado como líder de uma célula no sistema.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <Card className="mb-8 bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle>Relatório da Célula: {cell.nome}</CardTitle>
                    <CardDescription>
                        Líder, preencha o relatório da reunião desta semana. Sua dedicação é fundamental para o cuidado e crescimento do rebanho!
                    </CardDescription>
                </CardHeader>
            </Card>
            {members && user && <CellReportForm cell={cell} members={members} leaderId={user.uid} />}
        </div>
    );
}
