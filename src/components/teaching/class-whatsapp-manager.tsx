'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering, type Class, type Course } from '@/contexts/volunteering-context';
import { 
    MessageCircle, Loader2, RefreshCw, CheckCircle2, 
    AlertCircle, PlusCircle, ExternalLink, HelpCircle,
    Shield, ShieldAlert, Settings
} from 'lucide-react';
import { usePeople } from "@/hooks/usePeople";

interface ClassWhatsappManagerProps {
    classData: Class;
    courseData: Course;
}

export function ClassWhatsappManager({ classData, courseData }: ClassWhatsappManagerProps) {
    const { toast } = useToast();
    const { updateClass } = useVolunteering();
    const { members } = usePeople();
    const users = members as any[] | undefined;

    const [groupInfo, setGroupInfo] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const whatsappGroupId = classData.whatsappGroupId;

    const fetchGroupInfo = useCallback(async () => {
        if (!whatsappGroupId) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/notifications/groups?id=${encodeURIComponent(whatsappGroupId)}`);
            if (res.ok) {
                const data = await res.json();
                setGroupInfo(data);
            } else {
                setGroupInfo({ _error: true });
            }
        } catch {
            setGroupInfo({ _error: true });
        } finally {
            setIsLoading(false);
        }
    }, [whatsappGroupId]);

    useEffect(() => {
        if (whatsappGroupId) {
            fetchGroupInfo();
        } else {
            setGroupInfo(null);
        }
    }, [whatsappGroupId, fetchGroupInfo]);

    const handleCreateGroup = async () => {
        setIsCreating(true);
        try {
            // Nome padrão solicitado: [Nome do curso] | [Nome da turma]
            const groupName = `${courseData.name} | ${classData.name}`.substring(0, 100);
            const description = `Grupo destinado a trazer informações e tirar dúvidas sobre o curso ${courseData.name}.`;
            
            // Resolve students numbers for initial creation
            const initialParticipants: string[] = [];
            if (classData.students && classData.students.length > 0 && users) {
                classData.students.forEach((studentId: string) => {
                    const u = users.find(usr => usr.id === studentId);
                    if (u) {
                        const phone = u.phone || u.phoneNumber || '';
                        if (u.lid) {
                            initialParticipants.push(u.lid);
                        } else if (phone) {
                            initialParticipants.push(phone);
                        }
                    }
                });
            }

            const res = await fetch('/api/notifications/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupName,
                    participants: initialParticipants,
                    description // Passamos a descrição personalizada na criação
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                const createdGroup = data.group?.data || data.group;
                const groupJid = createdGroup.id || createdGroup.jid;
                
                if (groupJid) {
                    await updateClass(classData.id, { whatsappGroupId: groupJid });
                    toast({ title: 'Grupo criado e vinculado!', description: `Grupo "${groupName}" criado com sucesso.` });
                } else {
                    throw new Error('JID do grupo não retornado pela API.');
                }
            } else {
                toast({ variant: 'destructive', title: 'Erro ao criar grupo', description: data.error || 'Erro desconhecido' });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Erro de conexão', description: e.message });
        } finally {
            setIsCreating(false);
        }
    };

    const handleSyncGroup = async () => {
        if (!whatsappGroupId) return;
        setIsSyncing(true);
        try {
            const res = await fetch('/api/notifications/groups/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId: classData.id })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast({ 
                    title: 'Grupo sincronizado!', 
                    description: `Adicionados: ${data.addedCount} | Removidos: ${data.removedCount}` 
                });
                fetchGroupInfo();
            } else {
                toast({ 
                    variant: 'destructive', 
                    title: 'Erro ao sincronizar', 
                    description: data.error || (data.errors ? data.errors.join(', ') : 'Erro desconhecido') 
                });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Erro de conexão', description: e.message });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleUpdateGroupMetadata = async () => {
        if (!whatsappGroupId) return;
        setIsSyncing(true);
        try {
            const expectedName = `${courseData.name} | ${classData.name}`.substring(0, 100);
            const expectedDesc = `Grupo destinado a trazer informações e tirar dúvidas sobre o curso ${courseData.name}.`;

            // 1. Atualiza Nome (Subject)
            const resName = await fetch('/api/notifications/groups', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: whatsappGroupId,
                    action: 'updateSubject',
                    editName: expectedName
                })
            });

            // 2. Atualiza Descrição
            const resDesc = await fetch('/api/notifications/groups', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: whatsappGroupId,
                    action: 'updateDescription',
                    editDesc: expectedDesc
                })
            });

            const dataName = await resName.json();
            const dataDesc = await resDesc.json();

            if (resName.ok && resDesc.ok) {
                toast({ title: 'Metadados atualizados!', description: 'Nome e descrição do grupo foram formatados com sucesso no WhatsApp.' });
                fetchGroupInfo();
            } else {
                toast({ 
                    variant: 'destructive', 
                    title: 'Erro ao atualizar dados', 
                    description: dataName.error || dataDesc.error || 'Erro desconhecido.' 
                });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Erro de conexão', description: e.message });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleUpdateAdminStatus = async (participantJid: string, action: 'promote' | 'demote') => {
        if (!whatsappGroupId) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/notifications/groups', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: whatsappGroupId,
                    action: action, // 'promote' ou 'demote'
                    participants: [participantJid]
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast({ 
                    title: action === 'promote' ? 'Promovido a Admin!' : 'Rebaixado de Admin!', 
                    description: 'O status do participante foi atualizado no WhatsApp.' 
                });
                fetchGroupInfo();
            } else {
                toast({ 
                    variant: 'destructive', 
                    title: 'Erro ao alterar permissão', 
                    description: data.error || 'A ação foi rejeitada pela Evolution API.' 
                });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Erro de conexão', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const isClassCompleted = classData.status === 'completed';

    return (
        <Card className="shadow-sm border border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 p-6">
                <div>
                    <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-emerald-600" />
                        Grupo do WhatsApp da Turma
                    </CardTitle>
                    <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Sincronização e gerenciamento de participantes da turma de ensino
                    </CardDescription>
                </div>
                {whatsappGroupId && (
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleSyncGroup} 
                            disabled={isSyncing || isLoading}
                            className="font-bold text-xs"
                        >
                            {isSyncing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <RefreshCw className="h-3 w-3 mr-2" />}
                            Sincronizar Alunos
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleUpdateGroupMetadata} 
                            disabled={isSyncing || isLoading}
                            className="font-bold text-xs gap-1.5"
                            title="Atualizar Nome e Descrição do Grupo no WhatsApp para o padrão correto"
                        >
                            <Settings className="h-3.5 w-3.5" />
                            Ajustar Nome/Desc
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={fetchGroupInfo} 
                            disabled={isLoading}
                            className="h-8 w-8 p-0"
                        >
                            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                {!whatsappGroupId ? (
                    <div className="text-center py-10 border border-dashed rounded-xl bg-slate-50/20">
                        <MessageCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-base font-bold text-slate-800">Nenhum grupo vinculado</h3>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-6">
                            Você pode criar um grupo de WhatsApp exclusivo para esta turma. Todos os alunos atuais serão adicionados automaticamente.
                        </p>
                        <Button 
                            onClick={handleCreateGroup} 
                            disabled={isCreating}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                            {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                            Criar e Vincular Grupo
                        </Button>
                    </div>
                ) : isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                        <span className="text-xs text-muted-foreground mt-2">Carregando informações do grupo do WhatsApp...</span>
                    </div>
                ) : groupInfo?._error ? (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-sm">Erro ao buscar informações do grupo</h4>
                            <p className="text-xs mt-1">Não conseguimos conectar com a Evolution API. Certifique-se de que a instância do WhatsApp está ativa.</p>
                            <Button size="sm" variant="outline" onClick={fetchGroupInfo} className="mt-3 text-red-800 border-red-200 hover:bg-red-100 font-bold text-xs h-7">
                                Tentar Novamente
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Group Specs Card */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-slate-50 border rounded-xl">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Nome do Grupo</span>
                                <p className="text-sm font-bold text-slate-800 mt-1 truncate">{groupInfo?.name || 'Carregando...'}</p>
                            </div>
                            <div className="p-4 bg-slate-50 border rounded-xl">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Descrição</span>
                                <p className="text-xs text-slate-600 mt-1 truncate" title={groupInfo?.description || groupInfo?.desc || 'Sem descrição'}>
                                    {groupInfo?.description || groupInfo?.desc || 'Nenhuma descrição salva'}
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 border rounded-xl">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">JID do Grupo</span>
                                <p className="text-xs font-mono text-slate-600 mt-1 truncate">{whatsappGroupId}</p>
                            </div>
                            <div className="p-4 bg-slate-50 border rounded-xl">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Status da Integração</span>
                                <div className="mt-1">
                                    {isClassCompleted ? (
                                        <Badge variant="destructive" className="font-bold">Turma Concluída (Limpo)</Badge>
                                    ) : (
                                        <Badge className="bg-emerald-100 border border-emerald-300 text-emerald-800 hover:bg-emerald-200 font-bold">Ativa & Sincronizada</Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sync Overview */}
                        <div className="border rounded-xl p-4 bg-muted/20">
                            <h4 className="text-xs font-black uppercase text-slate-700 mb-3 tracking-widest flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                Visão Geral de Alunos vs. WhatsApp ({classData.students?.length || 0} alunos)
                            </h4>
                            <p className="text-[11px] text-muted-foreground mb-4">
                                Os alunos da turma devem corresponder exatamente aos membros do grupo do WhatsApp. {isClassCompleted && "Como esta turma está encerrada/concluída, todos os alunos foram removidos do grupo de estudos."}
                            </p>

                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {(classData.students || []).map((studentId: string) => {
                                    const u = users?.find(usr => usr.id === studentId);
                                    if (!u) return null;
                                    
                                    const uPhone = String(u.phone || u.phoneNumber || '').replace(/\D/g, '');
                                    const uPhoneLast8 = uPhone.slice(-8);
                                    
                                    // Localiza a identidade do participante no WhatsApp
                                    const waMember = groupInfo?.participants?.find((p: any) => {
                                        const pId = p.id || '';
                                        const pPhone = pId.split('@')[0].split(':')[0].replace(/\D/g, '');
                                        const waPhoneAttr = (p.phoneNumber || '').replace(/\D/g, '');
                                        
                                        // Compara por JID, LID, telefone cheio ou pelos últimos 8 dígitos (evita o problema do nono dígito do Brasil)
                                        return pId.includes(uPhone) || 
                                               (u.lid && pId.includes(u.lid)) || 
                                               (uPhoneLast8.length === 8 && (pPhone.endsWith(uPhoneLast8) || waPhoneAttr.endsWith(uPhoneLast8)));
                                    });
                                    const isInGroup = !!waMember;
                                    const isWaAdmin = waMember?.admin === 'admin' || waMember?.admin === 'superadmin';
                                    const trueJid = waMember?.id || u.lid || `${uPhone}@s.whatsapp.net`;

                                    return (
                                        <div key={studentId} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg border text-xs bg-white">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-slate-800">{u.name}</span>
                                                    {isWaAdmin && (
                                                        <Badge className="bg-amber-100 border-amber-300 text-amber-800 font-bold text-[8px] h-3.5 flex items-center gap-0.5">
                                                            <Shield className="h-2 w-2" /> Admin
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground font-mono block">
                                                    {u.phone || u.phoneNumber || 'Sem telefone'} {u.lid && `| LID: ${u.lid}`}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isClassCompleted ? (
                                                    <Badge variant="secondary" className="text-[9px]">Removido (Encerrada)</Badge>
                                                ) : isInGroup ? (
                                                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px]">No Grupo</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[9px]">Pendente</Badge>
                                                )}
                                                
                                                {/* Botões de controle de administrador no grupo do WhatsApp */}
                                                {isInGroup && !isClassCompleted && (
                                                    <div className="flex items-center border-l pl-2 border-slate-100 gap-1">
                                                        {isWaAdmin ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleUpdateAdminStatus(trueJid, 'demote')}
                                                                className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                title="Remover Administrador no WhatsApp"
                                                            >
                                                                <ShieldAlert className="h-3.5 w-3.5" />
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleUpdateAdminStatus(trueJid, 'promote')}
                                                                className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                                title="Tornar Administrador no WhatsApp"
                                                            >
                                                                <Shield className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Extra Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={async () => {
                                    if (confirm('Deseja desvincular este grupo da turma? O grupo continuará existindo no WhatsApp, mas não será mais gerenciado por esta turma.')) {
                                        await updateClass(classData.id, { whatsappGroupId: null });
                                        toast({ title: 'Grupo desvinculado' });
                                    }
                                }}
                                className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 text-xs font-bold"
                            >
                                Desvincular Grupo
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
