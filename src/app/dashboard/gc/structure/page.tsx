
'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, deleteDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Users, ChevronDown, Pencil, Trash2, Network, AreaChart, Building2, PlusCircle } from "lucide-react";
import { Button } from '@/components/ui/button';
import { CreateRedeDialog } from '@/components/structure/create-rede-dialog';
import { CreateAreaDialog } from '@/components/structure/create-area-dialog';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type User = { id: string; name: string; hierarchy?: { role?: string; } };
type Cell = { id: string; nome: string; liderId: string; areaId: string; redeId: string; membros: string[] };
type Area = { id: string; nome: string; liderId: string; redeId: string; };
type Rede = { id: string; nome: string; liderId: string; pastorId: string; };

interface HierarchyNode {
    id: string;
    nome: string;
    liderName: string;
    type: 'pastor' | 'rede' | 'area' | 'cell';
    stats: {
        directChildren: number;
        participantes: number;
    };
    children: HierarchyNode[];
}

const nodeIcons = {
    pastor: { icon: Network, color: 'bg-indigo-100 text-indigo-600' },
    rede: { icon: AreaChart, color: 'bg-sky-100 text-sky-600' },
    area: { icon: Building2, color: 'bg-amber-100 text-amber-600' },
    cell: { icon: Users, color: 'bg-emerald-100 text-emerald-600' },
};

interface NodeCardProps {
    node: HierarchyNode;
    onEdit?: (node: HierarchyNode) => void;
    onDelete?: (node: HierarchyNode) => void;
    children?: React.ReactNode;
    onToggle?: () => void;
    isExpanded?: boolean;
    hasChildren?: boolean;
    isRoot?: boolean;
}

const NodeCard = ({ node, onEdit, onDelete, children, onToggle, isExpanded, hasChildren, isRoot }: NodeCardProps) => {
    const config = nodeIcons[node.type] || nodeIcons.cell;
    const Icon = config.icon;

    return (
        <div className="relative flex flex-col items-center">
            {!isRoot && <div className="absolute top-0 -mt-2 h-2 w-0.5 bg-slate-300"></div>}

            <Card className="w-64 shadow-md hover:shadow-xl transition-shadow duration-300 z-10 bg-card">
                 <CardHeader className="flex flex-row items-center gap-3 p-4">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", config.color)}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 truncate text-left">
                        <CardTitle className="text-base truncate">{node.nome}</CardTitle>
                        <CardDescription className="text-xs truncate">{node.liderName}</CardDescription>
                    </div>
                 </CardHeader>
                 <CardContent className="px-4 pb-4 pt-0">
                    <div className="text-xs space-y-1.5">
                        {node.type !== 'cell' && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Sub-níveis:</span>
                                <span className="font-bold">{node.stats.directChildren}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Participantes:</span>
                            <span className="font-bold">{node.stats.participantes}</span>
                        </div>
                     </div>
                 </CardContent>
                 {(onEdit || onDelete || hasChildren) && (
                    <CardFooter className="bg-slate-50 p-1 flex justify-end items-center">
                         {onEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(node)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                        )}
                        {onDelete && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(node)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        )}
                         {hasChildren && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle}>
                                <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                            </Button>
                        )}
                    </CardFooter>
                 )}
            </Card>
            
            {isExpanded && hasChildren && (
                <>
                    <div className="absolute top-full h-4 w-0.5 bg-slate-300"></div>
                    <div className="absolute top-full mt-4 h-0.5 w-full bg-slate-300"></div>
                    <div className="mt-8 flex justify-center gap-8 w-full">
                        {children}
                    </div>
                </>
            )}
        </div>
    );
};

const buildHierarchy = (users: User[], redes: Rede[], areas: Area[], cells: Cell[]): HierarchyNode | null => {
    const userMap = new Map(users.map(u => [u.id, u]));

    const seniorPastor = users.find(u => u.hierarchy?.role === 'pastor_senior') || users.find(u => u.hierarchy?.role === 'admin');
    if (!seniorPastor) return null;

    const cellNodes: (HierarchyNode & { areaId: string })[] = cells.map(cell => ({
        id: cell.id,
        nome: cell.nome,
        type: 'cell',
        liderName: userMap.get(cell.liderId)?.name || 'N/A',
        areaId: cell.areaId,
        stats: {
            directChildren: 0,
            participantes: cell.membros?.length || 0,
        },
        children: []
    }));

    const areaNodes: (HierarchyNode & { redeId: string })[] = areas.map(area => {
        const areaCells = cellNodes.filter(c => c.areaId === area.id);
        const participantes = areaCells.reduce((sum, c) => sum + c.stats.participantes, 0);
        return {
            id: area.id,
            nome: area.nome,
            type: 'area',
            redeId: area.redeId,
            liderName: userMap.get(area.liderId)?.name || 'N/A',
            stats: {
                directChildren: areaCells.length,
                participantes: participantes,
            },
            children: areaCells
        };
    });

    const redeNodes: (HierarchyNode & { pastorId: string })[] = redes.map(rede => {
        const redeAreas = areaNodes.filter(a => a.redeId === rede.id);
        const participantes = redeAreas.reduce((sum, a) => sum + a.stats.participantes, 0);
        return {
            id: rede.id,
            nome: rede.nome,
            type: 'rede',
            pastorId: rede.pastorId,
            liderName: userMap.get(rede.liderId)?.name || 'N/A',
            stats: {
                directChildren: redeAreas.length,
                participantes: participantes,
            },
            children: redeAreas
        };
    });

    const totalParticipantes = redeNodes.reduce((sum, r) => sum + r.stats.participantes, 0);

    return {
        id: seniorPastor.id,
        nome: 'Igreja Batista da Manhã',
        liderName: `Pastor Sênior: ${seniorPastor.name}`,
        type: 'pastor',
        stats: { 
            directChildren: redeNodes.length,
            participantes: totalParticipantes,
        },
        children: redeNodes
    };
};

interface RenderNodeProps {
    node: HierarchyNode;
    onEditNode: (node: HierarchyNode) => void;
    onDeleteNode: (node: HierarchyNode) => void;
    isRoot?: boolean;
}

const RenderNode = ({ node, onEditNode, onDeleteNode, isRoot = false }: RenderNodeProps) => {
    const [isExpanded, setIsExpanded] = useState(isRoot);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="flex flex-col items-center">
            <NodeCard
                node={node}
                isExpanded={isExpanded}
                hasChildren={hasChildren}
                onToggle={() => setIsExpanded(!isExpanded)}
                onEdit={node.type === 'rede' || node.type === 'area' ? onEditNode : undefined}
                onDelete={node.type === 'rede' || node.type === 'area' ? onDeleteNode : undefined}
                isRoot={isRoot}
            >
                {isExpanded && hasChildren && (
                    <div className="flex justify-center gap-8 w-full relative pt-8">
                        {node.children.length > 1 && <div className="absolute top-10 h-0.5 bg-slate-300 left-1/4 right-1/4"></div>}
                        
                        {node.children.map(childNode => (
                            <RenderNode 
                                key={childNode.id} 
                                node={childNode} 
                                onEditNode={onEditNode} 
                                onDeleteNode={onDeleteNode}
                            />
                        ))}
                    </div>
                )}
            </NodeCard>
        </div>
    );
};


export default function StructurePage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isRedeDialogOpen, setRedeDialogOpen] = useState(false);
    const [isAreaDialogOpen, setAreaDialogOpen] = useState(false);
    const [editingNode, setEditingNode] = useState<HierarchyNode | null>(null);
    const [nodeToDelete, setNodeToDelete] = useState<HierarchyNode | null>(null);
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const cellsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'cells')) : null, [firestore]);
    const areasQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'areas')) : null, [firestore]);
    const redesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'redes')) : null, [firestore]);

    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
    const { data: cells, isLoading: isLoadingCells } = useCollection<Cell>(cellsQuery);
    const { data: areas, isLoading: isLoadingAreas } = useCollection<Area>(areasQuery);
    const { data: redes, isLoading: isLoadingRedes } = useCollection<Rede>(redesQuery);

    const hierarchyData = useMemo(() => {
        if (!users || !redes || !areas || !cells) return null;
        return buildHierarchy(users, redes, areas, cells);
    }, [users, redes, areas, cells]);
    
    const isLoading = isLoadingUsers || isLoadingCells || isLoadingAreas || isLoadingRedes;

    const handleEditNode = (node: HierarchyNode) => {
        setEditingNode(node);
        if (node.type === 'rede') {
            setRedeDialogOpen(true);
        } else if (node.type === 'area') {
            setAreaDialogOpen(true);
        }
    };
    
    const handleDeleteNode = (node: HierarchyNode) => {
        setNodeToDelete(node);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!nodeToDelete || !firestore) return;
    
        if (nodeToDelete.type === 'rede') {
            const areasQ = query(collection(firestore, 'areas'), where('redeId', '==', nodeToDelete.id));
            try {
                const areasSnapshot = await getDocs(areasQ);
                const deletePromises: Promise<void>[] = [];
                areasSnapshot.forEach(areaDoc => {
                    deletePromises.push(deleteDocumentNonBlocking(doc(firestore, 'areas', areaDoc.id)));
                });
                
                await Promise.all(deletePromises);

                const redeDocRef = doc(firestore, 'redes', nodeToDelete.id);
                deleteDocumentNonBlocking(redeDocRef);
                
                toast({
                    title: "Exclusão em Cascata Iniciada",
                    description: `A rede "${nodeToDelete.nome}" e todas as suas áreas serão excluídas.`,
                });

            } catch (error) {
                 toast({
                    variant: "destructive",
                    title: "Erro na Exclusão em Cascata",
                    description: "Não foi possível buscar as áreas para exclusão.",
                });
            }

        } else if (nodeToDelete.type === 'area') {
            const docRef = doc(firestore, 'areas', nodeToDelete.id);
            deleteDocumentNonBlocking(docRef);
            toast({
                title: "Exclusão Iniciada",
                description: `A área "${nodeToDelete.nome}" será excluída em breve.`,
            });
        }
    
        setDeleteDialogOpen(false);
        setNodeToDelete(null);
    };

    const handleCloseDialogs = () => {
        setEditingNode(null);
        setRedeDialogOpen(false);
        setAreaDialogOpen(false);
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Estrutura Hierárquica</CardTitle>
                        <CardDescription>Visualize e gerencie as redes, áreas e GCs da igreja.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => { setEditingNode(null); setAreaDialogOpen(true); }}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Criar Área
                        </Button>
                        <Button onClick={() => { setEditingNode(null); setRedeDialogOpen(true); }}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Criar Rede
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="overflow-x-auto p-8 bg-slate-50/50 min-h-[60vh]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-4 text-muted-foreground">Carregando estrutura...</p>
                        </div>
                    ) : (
                         hierarchyData ? (
                            <div className="flex justify-center">
                                <RenderNode node={hierarchyData} isRoot={true} onEditNode={handleEditNode} onDeleteNode={handleDeleteNode} />
                            </div>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <p>Nenhuma hierarquia encontrada.</p>
                                <p className="text-sm">Para começar, vá para <strong>Configurações</strong> e defina um usuário como <strong>Admin</strong> ou <strong>Pastor Sênior</strong>.</p>
                            </div>
                        )
                    )}
                </CardContent>
            </Card>

            {users && (
              <CreateRedeDialog 
                open={isRedeDialogOpen}
                onOpenChange={handleCloseDialogs}
                users={users}
                existingRede={editingNode?.type === 'rede' ? editingNode : null}
              />
            )}

            {users && redes && (
                 <CreateAreaDialog 
                    open={isAreaDialogOpen}
                    onOpenChange={handleCloseDialogs}
                    users={users}
                    redes={redes}
                    existingArea={editingNode?.type === 'area' ? editingNode : null}
                />
            )}
            
            {nodeToDelete && (
                <DeleteConfirmationDialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    onConfirm={confirmDelete}
                    itemName={nodeToDelete.nome}
                    itemType={nodeToDelete.type === 'rede' ? 'Rede' : 'Área'}
                />
            )}
        </>
    );
}
