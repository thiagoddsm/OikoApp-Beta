
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Loader2, Users, Plus, Minus, Flag, PlusCircle, Pencil, Trash2, Network, AreaChart, Building2 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { CreateRedeDialog } from '@/components/structure/create-rede-dialog';
import { CreateAreaDialog } from '@/components/structure/create-area-dialog';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';


type User = { id: string; name: string; hierarchy?: { role?: string; } };
type Cell = { id: string; nome: string; liderId: string; areaId: string; redeId: string; membros: string[] };
type Area = { id: string; nome: string; liderId: string; redeId: string; };
type Rede = { id: string; nome: string; liderId: string; pastorId: string; };

const HierarchyNode = ({ node, level, children, isExpanded, onToggle, onEdit, onDelete }) => {
    const icons = {
        pastor: Network,
        rede: AreaChart,
        area: Building2,
        cell: Users
    };
    const Icon = icons[node.type] || Users;

    const statLabels = {
        pastor: 'Redes',
        rede: 'Áreas',
        area: 'GCs',
        cell: 'Membros'
    };
    
    return (
        <div style={{ marginLeft: `${level > 1 ? (level -1) * 1.5 : 0}rem` }}>
             <div className="relative flex items-center">
                 {level > 1 && (
                    <div className="absolute -left-5 h-full">
                        <div className="h-1/2 w-px bg-gray-300"></div>
                        <div className="h-1/2 w-4 border-b border-l border-gray-300 rounded-bl-lg"></div>
                    </div>
                )}

                <Card className="flex-1 flex items-center justify-between p-3 my-1 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                         <button onClick={onToggle} className="p-1 rounded-full hover:bg-gray-100">
                           {children && (isExpanded ? <Minus size={16} /> : <Plus size={16} />)}
                           {!children && <span className="w-4"></span>}
                        </button>
                        <div className={`flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary`}>
                            <Icon size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-sm uppercase">{node.nome}</p>
                            <p className="text-xs text-muted-foreground">{node.type !== 'cell' ? `Líder: ${node.liderName}` : `Membros: ${node.stats.participantes}`}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-4 text-xs">
                           <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {node.type === 'pastor' && (
                                   <>
                                    <span className="text-muted-foreground">Redes</span>
                                    <span className="font-bold text-right">{node.stats.directChildren}</span>
                                    <span className="text-muted-foreground">Total Áreas</span>
                                    <span className="font-bold text-right">{node.stats.totalAreas}</span>
                                   </>
                                )}
                               {node.type === 'rede' && (
                                   <>
                                    <span className="text-muted-foreground">Áreas</span>
                                    <span className="font-bold text-right">{node.stats.directChildren}</span>
                                   </>
                               )}
                               {node.type === 'area' && (
                                   <>
                                    <span className="text-muted-foreground">GCs</span>
                                    <span className="font-bold text-right">{node.stats.directChildren}</span>
                                   </>
                               )}
                               
                               {node.type !== 'cell' && (
                                   <>
                                    <span className="text-muted-foreground">Total GCs</span>
                                    <span className="font-bold text-right">{node.stats.totalCells}</span>
                                   </>
                               )}
                               <span className="text-muted-foreground">Participantes</span>
                               <span className="font-bold text-right">{node.stats.participantes}</span>
                            </div>
                        </div>
                        {(onEdit || onDelete) && (
                            <div className="flex items-center">
                                {onEdit && (
                                    <Button variant="ghost" size="icon" onClick={() => onEdit(node)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                )}
                                {onDelete && (
                                    <Button variant="ghost" size="icon" onClick={() => onDelete(node)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </Card>
            </div>
             {isExpanded && children && <div className="mt-1">{children}</div>}
        </div>
    )
}

const buildHierarchy = (users, redes, areas, cells) => {
    const userMap = new Map(users.map(u => [u.id, u]));

    // 1. Find the Senior Pastor or the first Admin as the root of the hierarchy
    const seniorPastor = users.find(u => u.hierarchy?.role === 'pastor_senior') || users.find(u => u.hierarchy?.role === 'admin');
    
    if (!seniorPastor) {
        return []; // If there's no senior pastor or admin, there's no hierarchy to show
    }

    const cellNodes = cells.map(cell => ({
        ...cell,
        type: 'cell',
        liderName: userMap.get(cell.liderId)?.name || 'N/A',
        stats: {
            directChildren: 0,
            totalCells: 1,
            participantes: cell.membros?.length || 0,
        },
        children: []
    }));

    const areaNodes = areas.map(area => {
        const areaCells = cellNodes.filter(c => c.areaId === area.id);
        const participantes = areaCells.reduce((sum, c) => sum + c.stats.participantes, 0);
        return {
            ...area,
            type: 'area',
            liderName: userMap.get(area.liderId)?.name || 'N/A',
            stats: {
                directChildren: areaCells.length,
                totalCells: areaCells.length,
                participantes: participantes,
            },
            children: areaCells
        };
    });

    const redeNodes = redes.map(rede => {
        const redeAreas = areaNodes.filter(a => a.redeId === rede.id);
        const participantes = redeAreas.reduce((sum, a) => sum + a.stats.participantes, 0);
        const totalCells = redeAreas.reduce((sum, a) => sum + a.stats.totalCells, 0);
        return {
            ...rede,
            type: 'rede',
            liderName: userMap.get(rede.liderId)?.name || 'N/A',
            stats: {
                directChildren: redeAreas.length,
                totalCells: totalCells,
                participantes: participantes,
            },
            children: redeAreas
        };
    });

    const totalParticipantes = redeNodes.reduce((sum, r) => sum + r.stats.participantes, 0);
    const totalCells = redeNodes.reduce((sum, r) => sum + r.stats.totalCells, 0);
    const totalAreas = areaNodes.length;

    // 2. Build the hierarchy from a single root node
    const rootNode = {
        id: seniorPastor.id,
        nome: seniorPastor.hierarchy?.role === 'admin' ? 'Igreja' : 'Pastor Sênior',
        liderName: seniorPastor.name,
        type: 'pastor',
        stats: { 
            directChildren: redeNodes.length,
            totalCells: totalCells,
            participantes: totalParticipantes,
            totalAreas: totalAreas,
        },
        children: redeNodes
    };

    return [rootNode];
};

const RenderHierarchy = ({ nodes, level = 1, onEditNode, onDeleteNode }) => {
    const [expandedNodes, setExpandedNodes] = useState({});

    // Expand the first level by default
    useEffect(() => {
        if (level === 1 && nodes.length > 0) {
            setExpandedNodes(prev => ({ ...prev, [nodes[0].id]: true }));
        }
    }, [nodes, level]);


    const toggleNode = (nodeId) => {
        setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
    };

    return (
        <div>
            {nodes.map(node => (
                <HierarchyNode
                    key={node.id}
                    node={node}
                    level={level}
                    isExpanded={!!expandedNodes[node.id]}
                    onToggle={() => toggleNode(node.id)}
                    onEdit={node.type === 'rede' || node.type === 'area' ? onEditNode : null}
                    onDelete={node.type === 'rede' || node.type === 'area' ? onDeleteNode : null}
                >
                    {node.children && node.children.length > 0 && (
                        <RenderHierarchy nodes={node.children} level={level + 1} onEditNode={onEditNode} onDeleteNode={onDeleteNode}/>
                    )}
                </HierarchyNode>
            ))}
        </div>
    );
};


export default function StructurePage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isRedeDialogOpen, setRedeDialogOpen] = useState(false);
    const [isAreaDialogOpen, setAreaDialogOpen] = useState(false);
    const [editingNode, setEditingNode] = useState(null);
    const [nodeToDelete, setNodeToDelete] = useState(null);
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const { data: users, isLoading: isLoadingUsers } = useCollection<User>('users');
    const { data: cells, isLoading: isLoadingCells } = useCollection<Cell>('cells');
    const { data: areas, isLoading: isLoadingAreas } = useCollection<Area>('areas');
    const { data: redes, isLoading: isLoadingRedes } = useCollection<Rede>('redes');

    const hierarchyData = useMemo(() => {
        if (!users || !redes || !areas || !cells) return [];
        return buildHierarchy(users, redes, areas, cells);
    }, [users, redes, areas, cells]);
    
    const isLoading = isLoadingUsers || isLoadingCells || isLoadingAreas || isLoadingRedes;

    const handleEditNode = (node) => {
        setEditingNode(node);
        if (node.type === 'rede') {
            setRedeDialogOpen(true);
        } else if (node.type === 'area') {
            setAreaDialogOpen(true);
        }
    };
    
    const handleDeleteNode = (node) => {
        setNodeToDelete(node);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!nodeToDelete || !firestore) return;
    
        if (nodeToDelete.type === 'rede') {
            // Cascade delete: delete areas within the network first
            const areasQuery = query(collection(firestore, 'areas'), where('redeId', '==', nodeToDelete.id));
            try {
                const areasSnapshot = await getDocs(areasQuery);
                const deletePromises = [];
                areasSnapshot.forEach(areaDoc => {
                    deletePromises.push(deleteDocumentNonBlocking(doc(firestore, 'areas', areaDoc.id)));
                });
                
                await Promise.all(deletePromises);

                // After queuing area deletions, delete the network itself
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
            // Just delete the area
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
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-4 text-muted-foreground">Carregando estrutura...</p>
                        </div>
                    ) : (
                         hierarchyData.length > 0 ? (
                            <RenderHierarchy nodes={hierarchyData} onEditNode={handleEditNode} onDeleteNode={handleDeleteNode} />
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
