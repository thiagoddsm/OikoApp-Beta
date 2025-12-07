
'use client';

import React, { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Loader2, Users, Plus, Minus, Flag, PlusCircle, Pencil } from "lucide-react";
import { Button } from '@/components/ui/button';
import { CreateRedeDialog } from '@/components/structure/create-rede-dialog';
import { CreateAreaDialog } from '@/components/structure/create-area-dialog';


type User = { id: string; name: string; hierarchy?: { role?: string; } };
type Cell = { id: string; nome: string; liderId: string; areaId: string; redeId: string; membros: string[] };
type Area = { id: string; nome: string; liderId: string; redeId: string; };
type Rede = { id: string; nome: string; liderId: string; pastorId: string; };

const HierarchyNode = ({ node, level, children, isExpanded, onToggle, onEdit }) => {
    const Icon = Users;
    
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
                            <p className="text-xs text-muted-foreground">NÍVEL {level} | Líder: {node.liderName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex flex-col gap-1">
                               <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">Níveis</span>
                                    <span className="font-bold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-xs">{node.stats.niveis}</span>
                               </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">Grupos</span>
                                    <span className="font-bold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-xs">{node.stats.grupos}</span>
                               </div>
                               <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">Participantes</span>
                                    <span className="font-bold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-xs">{node.stats.participantes}</span>
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Flag size={20} className="text-orange-400" />
                                <span className="font-bold text-base text-orange-500">{node.stats.percentage.toFixed(2)}%</span>
                            </div>
                        </div>
                        {onEdit && (
                             <Button variant="ghost" size="icon" onClick={() => onEdit(node)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
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
    let hierarchy = [];

    const pastors = users.filter(u => u.hierarchy?.role === 'pastor_senior');
    
    // Nível 1: Pastores
    hierarchy = pastors.map(pastor => {
        const pastorRedes = redes.filter(r => r.pastorId === pastor.id);
        const pastorRedeIds = pastorRedes.map(r => r.id);
        const pastorAreas = areas.filter(a => pastorRedeIds.includes(a.redeId));
        const pastorAreaIds = pastorAreas.map(a => a.id);
        const pastorCells = cells.filter(c => pastorAreaIds.includes(c.areaId));

        return {
            id: pastor.id,
            nome: 'Pastor',
            liderName: pastor.name,
            type: 'pastor',
            stats: { niveis: 4, grupos: pastorCells.length, participantes: pastorCells.reduce((sum, c) => sum + c.membros.length, 0), percentage: 56.74 },
            children: pastorRedes.map(rede => { // Nível 2: Redes
                const redeAreas = areas.filter(a => a.redeId === rede.id);
                const redeAreaIds = redeAreas.map(a => a.id);
                const redeCells = cells.filter(c => redeAreaIds.includes(c.areaId));
                return {
                    ...rede,
                    id: rede.id,
                    nome: rede.nome,
                    liderName: userMap.get(rede.liderId)?.name || 'N/A',
                    type: 'rede',
                    stats: { niveis: 0, grupos: redeCells.length, participantes: redeCells.reduce((sum, c) => sum + c.membros.length, 0), percentage: 55.07 },
                    children: redeAreas.map(area => { // Nível 3: Áreas
                        const areaCells = cells.filter(c => c.areaId === area.id);
                        return {
                            ...area,
                            id: area.id,
                            nome: area.nome,
                            liderName: userMap.get(area.liderId)?.name || 'N/A',
                            type: 'area',
                            stats: { niveis: 0, grupos: areaCells.length, participantes: areaCells.reduce((sum, c) => sum + c.membros.length, 0), percentage: 53.21 },
                            children: areaCells.map(cell => ({ // Nível 4: Células
                                ...cell,
                                id: cell.id,
                                nome: cell.nome,
                                liderName: userMap.get(cell.liderId)?.name || 'N/A',
                                type: 'cell',
                                stats: { niveis: 0, grupos: 1, participantes: cell.membros.length, percentage: 60.00 },
                                children: [],
                            }))
                        }
                    })
                }
            })
        }
    });

    return hierarchy;
};

const RenderHierarchy = ({ nodes, level = 1, onEditNode }) => {
    const [expandedNodes, setExpandedNodes] = useState({});

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
                >
                    {node.children && node.children.length > 0 && (
                        <RenderHierarchy nodes={node.children} level={level + 1} onEditNode={onEditNode} />
                    )}
                </HierarchyNode>
            ))}
        </div>
    );
};


export default function StructurePage() {
    const [isRedeDialogOpen, setRedeDialogOpen] = useState(false);
    const [isAreaDialogOpen, setAreaDialogOpen] = useState(false);
    const [editingNode, setEditingNode] = useState(null);

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
                        <CardDescription>Visualize e gerencie as redes, áreas e células da igreja.</CardDescription>
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
                        <RenderHierarchy nodes={hierarchyData} onEditNode={handleEditNode} />
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
        </>
    );
}
