'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering, type Class, type Course } from '@/contexts/volunteering-context';
import { 
    MessageCircle, Loader2, RefreshCw, CheckCircle2, 
    AlertCircle, PlusCircle, ExternalLink, HelpCircle,
    Shield, ShieldAlert, Settings, Edit3, Send, Copy, 
    Check, Users, GraduationCap, HandHelping, Share2, 
    Link as LinkIcon, UserPlus, Info
} from 'lucide-react';
import { useMembersData } from "@/hooks/useDomainData";
import { useFirebase, initializeFirebase } from '@/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, getDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface ClassWhatsappManagerProps {
    classData: Class;
    courseData: Course;
}

export function ClassWhatsappManager({ classData, courseData }: ClassWhatsappManagerProps) {
    const { toast } = useToast();
    const { storage } = useFirebase();
    const { updateClass } = useVolunteering();
    const { users } = useMembersData();

    const [groupInfo, setGroupInfo] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [copiedInvite, setCopiedInvite] = useState(false);
    
    // Modal states for manual metadata edit
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editGroupName, setEditGroupName] = useState('');
    const [editGroupDesc, setEditGroupDesc] = useState('');
    const [editGroupPicture, setEditGroupPicture] = useState('');
    const [isUploadingPic, setIsUploadingPic] = useState(false);

    // Modal states for sending invite links
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [customInviteMsg, setCustomInviteMsg] = useState('');
    const [isSendingInvites, setIsSendingInvites] = useState(false);
    const [selectedStudentForInvite, setSelectedStudentForInvite] = useState<string | null>(null);

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

    // Populate inputs when groupInfo changes
    useEffect(() => {
        if (groupInfo) {
            setEditGroupName(groupInfo.name || '');
            setEditGroupDesc(groupInfo.description || groupInfo.desc || '');
        }
    }, [groupInfo]);

    // Resolvers para Professores, Apoio e Alunos
    const resolvedTeachers = useMemo(() => {
        const teacherIdsSet = new Set<string>();
        if (classData.teacherId) teacherIdsSet.add(classData.teacherId);
        const rawClassTeachers = (classData as any).teacherIds;
        if (Array.isArray(rawClassTeachers)) rawClassTeachers.forEach((id: string) => teacherIdsSet.add(id));
        if (Array.isArray((courseData as any)?.teacherIds)) (courseData as any).teacherIds.forEach((id: string) => teacherIdsSet.add(id));
        if (classData.scheduleOverrides) {
            Object.values(classData.scheduleOverrides).forEach((ov: any) => {
                if (ov?.teacherId) teacherIdsSet.add(ov.teacherId);
            });
        }
        return (users || []).filter(u => teacherIdsSet.has(u.id));
    }, [classData, courseData, users]);

    const resolvedSupportTeam = useMemo(() => {
        const supportIdsSet = new Set<string>();
        const rawClassSupport = (classData as any).supportTeamIds || (classData as any).supportTeam || [];
        const rawCourseSupport = (courseData as any).supportTeamIds || (courseData as any).supportTeam || [];
        if (Array.isArray(rawClassSupport)) rawClassSupport.forEach((id: string) => supportIdsSet.add(id));
        if (Array.isArray(rawCourseSupport)) rawCourseSupport.forEach((id: string) => supportIdsSet.add(id));
        return (users || []).filter(u => supportIdsSet.has(u.id));
    }, [classData, courseData, users]);

    const resolvedStudents = useMemo(() => {
        const studentIds = classData.students || [];
        return (users || []).filter(u => studentIds.includes(u.id));
    }, [classData.students, users]);

    // Link de Convite
    const inviteLink = groupInfo?.inviteUrl || (groupInfo?.inviteCode ? `https://chat.whatsapp.com/${groupInfo.inviteCode}` : '');

    const handleCopyInvite = () => {
        if (!inviteLink) return;
        navigator.clipboard.writeText(inviteLink);
        setCopiedInvite(true);
        toast({ title: 'Link Copiado!', description: 'Link de convite do grupo copiado para a área de transferência.' });
        setTimeout(() => setCopiedInvite(false), 2500);
    };

    const handleCreateGroup = async () => {
        setIsCreating(true);
        try {
            const groupName = `${courseData.name} | ${classData.name}`.substring(0, 100);
            const expectedDesc = `Este grupo é destinado para informações, avisos e materiais do curso ${courseData.name}.`;
            
            // Busca o preset de imagem do curso
            let freshCoursePic = '';
            try {
                const { firestore } = initializeFirebase();
                const courseDocRef = doc(firestore, 'courses', courseData.id);
                const courseSnap = await getDoc(courseDocRef);
                if (courseSnap.exists()) {
                    freshCoursePic = courseSnap.data()?.whatsappGroupPicture || '';
                }
            } catch (errDb) {
                console.warn('Erro ao ler preset de imagem do curso via Firestore:', errDb);
            }

            // PARTICIPANTES INICIAIS SEGUROS: Professores e Equipe de Apoio (contatos oficiais)
            const initialParticipants: string[] = [];
            
            // 1. Adiciona Professores
            resolvedTeachers.forEach(teacher => {
                const phone = (teacher.phone || teacher.phoneNumber || '').replace(/\D/g, '');
                if (phone && phone.length >= 8) {
                    const formatted = phone.startsWith('55') ? phone : `55${phone}`;
                    if (!initialParticipants.includes(formatted)) initialParticipants.push(formatted);
                }
            });

            // 2. Adiciona Equipe de Apoio
            resolvedSupportTeam.forEach(support => {
                const phone = (support.phone || support.phoneNumber || '').replace(/\D/g, '');
                if (phone && phone.length >= 8) {
                    const formatted = phone.startsWith('55') ? phone : `55${phone}`;
                    if (!initialParticipants.includes(formatted)) initialParticipants.push(formatted);
                }
            });

            // Se não houver professor nem apoio com telefone, usa alunos como fallback (limite de segurança de 2 alunos)
            if (initialParticipants.length === 0 && resolvedStudents.length > 0) {
                resolvedStudents.slice(0, 2).forEach(student => {
                    const phone = (student.phone || student.phoneNumber || '').replace(/\D/g, '');
                    if (phone && phone.length >= 8) {
                        const formatted = phone.startsWith('55') ? phone : `55${phone}`;
                        if (!initialParticipants.includes(formatted)) initialParticipants.push(formatted);
                    }
                });
            }

            if (initialParticipants.length === 0) {
                toast({
                    variant: 'destructive',
                    title: 'Impossível criar grupo',
                    description: 'O grupo precisa de pelo menos 1 participante (Professor, Secretário ou Aluno) com telefone cadastrado.'
                });
                setIsCreating(false);
                return;
            }

            const res = await fetch('/api/notifications/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupName,
                    participants: initialParticipants
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                const createdGroup = data.group?.data || data.group;
                const groupJid = data.jid || createdGroup.id || createdGroup.jid;
                
                if (groupJid) {
                    await updateClass(classData.id, { whatsappGroupId: groupJid });

                    // 1. Atualiza Descrição no WhatsApp
                    try {
                        await new Promise(resolve => setTimeout(resolve, 2500));
                        await fetch('/api/notifications/groups', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                groupId: groupJid,
                                description: expectedDesc
                            })
                        });
                    } catch (descErr) {
                        console.error('Falha ao configurar descrição inicial:', descErr);
                    }

                    // 2. Atualiza Imagem do Grupo se houver preset
                    const finalPresetPic = freshCoursePic || (courseData as any).whatsappGroupPicture;
                    if (finalPresetPic) {
                        try {
                            await new Promise(resolve => setTimeout(resolve, 2500));
                            await fetch('/api/notifications/groups', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    groupId: groupJid,
                                    picture: finalPresetPic
                                })
                            });
                        } catch (picErr) {
                            console.error('Falha ao configurar imagem inicial de preset:', picErr);
                        }
                    }

                    toast({ 
                        title: 'Grupo Criado com Sucesso! 🚀', 
                        description: `Grupo "${groupName}" criado com os Professores e Equipe de Apoio.` 
                    });
                    fetchGroupInfo();
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
                    title: 'Grupo Sincronizado!', 
                    description: `Adicionados: ${data.addedCount} | Removidos: ${data.removedCount} | Equipe Protegida: ${(data.teachersProtected || 0) + (data.supportProtected || 0)}` 
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

    const handleSendInvites = async () => {
        if (!whatsappGroupId) return;
        setIsSendingInvites(true);
        try {
            const targetIds = selectedStudentForInvite 
                ? [selectedStudentForInvite]
                : undefined; // undefined = envia para todos os alunos da turma

            const res = await fetch('/api/notifications/groups/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classId: classData.id,
                    studentIds: targetIds,
                    customMessage: customInviteMsg || undefined
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast({
                    title: 'Convites Enviados no WhatsApp! 📩',
                    description: `${data.sentCount} convite(s) entregue(s) com sucesso no privado dos alunos.`
                });
                setIsInviteDialogOpen(false);
                setSelectedStudentForInvite(null);
                fetchGroupInfo();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao enviar convites',
                    description: data.error || 'Falha no disparo de mensagens.'
                });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Erro de conexão', description: e.message });
        } finally {
            setIsSendingInvites(false);
        }
    };

    const handleSaveManualMetadata = async () => {
        if (!whatsappGroupId) return;
        setIsSyncing(true);
        try {
            let success = true;
            let errorMsg = '';

            if (editGroupName.trim() !== (groupInfo?.name || '')) {
                const resName = await fetch('/api/notifications/groups', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        groupId: whatsappGroupId,
                        name: editGroupName
                    })
                });
                const dataName = await resName.json();
                if (!resName.ok || !dataName.success) {
                    success = false;
                    errorMsg = dataName.error || 'Erro ao atualizar nome.';
                }
            }

            const currentDesc = groupInfo?.description || groupInfo?.desc || '';
            if (editGroupDesc.trim() !== currentDesc) {
                const resDesc = await fetch('/api/notifications/groups', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        groupId: whatsappGroupId,
                        description: editGroupDesc
                    })
                });
                const dataDesc = await resDesc.json();
                if (!resDesc.ok || !dataDesc.success) {
                    success = false;
                    errorMsg = dataDesc.error || 'Erro ao atualizar descrição.';
                }
            }

            if (editGroupPicture) {
                const resPic = await fetch('/api/notifications/groups', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        groupId: whatsappGroupId,
                        picture: editGroupPicture
                    })
                });
                const dataPic = await resPic.json();
                if (!resPic.ok || !dataPic.success) {
                    success = false;
                    errorMsg = dataPic.error || 'Erro ao atualizar imagem de perfil do grupo.';
                }
            }

            if (success) {
                toast({ title: 'Dados salvos!', description: 'O nome, descrição e/ou imagem do grupo foram atualizados no WhatsApp.' });
                setEditGroupPicture('');
                setIsEditDialogOpen(false);
                fetchGroupInfo();
            } else {
                toast({ 
                    variant: 'destructive', 
                    title: 'Erro ao salvar dados', 
                    description: errorMsg || 'A Evolution API rejeitou a alteração.' 
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
                    action: action,
                    participants: [participantJid]
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast({ 
                    title: action === 'promote' ? 'Promovido a Admin! 🛡️' : 'Rebaixado de Admin!', 
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

    // Helper de checagem se usuário está no grupo do WhatsApp
    const checkUserInGroup = (user: any) => {
        if (!groupInfo?.participants) return { inGroup: false, isAdmin: false, trueJid: '' };
        const uPhone = String(user.phone || user.phoneNumber || '').replace(/\D/g, '');
        const uPhoneLast8 = uPhone.slice(-8);
        const uLid = user.lid && user.lid !== 'lid' ? user.lid : null;

        const waMember = groupInfo.participants.find((p: any) => {
            const pId = p.id || '';
            const pPhone = pId.split('@')[0].split(':')[0].replace(/\D/g, '');
            const waPhoneAttr = (p.phoneNumber || '').replace(/\D/g, '');
            return pId.includes(uPhone) || 
                   (uLid && pId.includes(uLid)) || 
                   (uPhoneLast8.length === 8 && (pPhone.endsWith(uPhoneLast8) || waPhoneAttr.endsWith(uPhoneLast8)));
        });

        const inGroup = !!waMember;
        const isAdmin = waMember?.admin === 'admin' || waMember?.admin === 'superadmin';
        const trueJid = waMember?.id || uLid || `${uPhone}@s.whatsapp.net`;

        return { inGroup, isAdmin, trueJid };
    };

    const isClassCompleted = classData.status === 'completed';

    // Contadores de membros
    const pendingStudentsCount = resolvedStudents.filter(s => !checkUserInGroup(s).inGroup).length;

    return (
        <Card className="shadow-sm border border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 p-6">
                <div>
                    <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-emerald-600" />
                        Grupo do WhatsApp da Turma
                    </CardTitle>
                    <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Sincronização, convites inteligentes e equipe de professores
                    </CardDescription>
                </div>
                {whatsappGroupId && (
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                setSelectedStudentForInvite(null);
                                setIsInviteDialogOpen(true);
                            }}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 font-bold text-xs gap-1.5 shadow-none"
                            title="Enviar o Link de Convite oficial no WhatsApp de todos os alunos pendentes"
                        >
                            <Send className="h-3.5 w-3.5" />
                            Enviar Convites no Privado {pendingStudentsCount > 0 && `(${pendingStudentsCount})`}
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleSyncGroup} 
                            disabled={isSyncing || isLoading}
                            className="font-bold text-xs gap-1.5"
                            title="Sincronizar participantes com proteção anti-ban"
                        >
                            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            Sincronizar
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={fetchGroupInfo} 
                            disabled={isLoading}
                            className="h-8 w-8 p-0"
                            title="Atualizar dados do grupo"
                        >
                            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                {!whatsappGroupId ? (
                    <div className="text-center py-10 border border-dashed rounded-xl bg-slate-50/20 max-w-2xl mx-auto">
                        <MessageCircle className="h-12 w-12 text-emerald-500/80 mx-auto mb-3" />
                        <h3 className="text-base font-bold text-slate-800">Criar Grupo Oficial da Turma</h3>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                            O grupo será criado de forma 100% segura com os <strong>Professores ({resolvedTeachers.length})</strong> e a <strong>Equipe de Apoio ({resolvedSupportTeam.length})</strong> como administradores.
                        </p>

                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 max-w-md mx-auto mb-6 text-left space-y-1.5 text-xs text-emerald-900">
                            <div className="flex items-center gap-1.5 font-bold">
                                <Shield className="size-4 text-emerald-700" />
                                <span>Proteção Anti-Ban Ativada</span>
                            </div>
                            <p className="text-[11px] text-emerald-800 leading-relaxed">
                                Para evitar bloqueios do WhatsApp, os alunos receberão o <strong>Link de Convite Oficial</strong> diretamente no privado para entrarem com 1 clique!
                            </p>
                        </div>

                        <Button 
                            onClick={handleCreateGroup} 
                            disabled={isCreating}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
                        >
                            {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                            Criar Grupo com Professores & Apoio
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
                            <p className="text-xs mt-1">Não conseguimos conectar com a Evolution API. Certifique-se de que a instância do WhatsApp está ativa e conectada.</p>
                            <Button size="sm" variant="outline" onClick={fetchGroupInfo} className="mt-3 text-red-800 border-red-200 hover:bg-red-100 font-bold text-xs h-7">
                                Tentar Novamente
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Banner de Link de Convite Oficial */}
                        {inviteLink && (
                            <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Share2 className="size-4 text-emerald-700" />
                                        <span className="text-xs font-black uppercase text-emerald-900 tracking-wider">Link Oficial de Convite</span>
                                        <Badge className="bg-emerald-200 text-emerald-900 text-[10px] font-bold">100% Anti-Ban</Badge>
                                    </div>
                                    <p className="text-xs text-slate-600 font-mono select-all truncate max-w-lg">
                                        {inviteLink}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCopyInvite}
                                        className="h-8 text-xs font-bold gap-1 bg-white border-emerald-300 hover:bg-emerald-50 text-emerald-800"
                                    >
                                        {copiedInvite ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                                        {copiedInvite ? 'Copiado!' : 'Copiar Link'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        asChild
                                        className="h-8 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        <a href={inviteLink} target="_blank" rel="noreferrer">
                                            <ExternalLink className="size-3.5" />
                                            Abrir no WhatsApp
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Group Specs Card */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-slate-50 border rounded-xl relative group-hover:border-slate-300 transition-all">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between">
                                    Nome do Grupo
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-5 w-5 hover:bg-slate-200 text-slate-500 rounded-full"
                                        onClick={() => setIsEditDialogOpen(true)}
                                        title="Editar Nome e Descrição"
                                    >
                                        <Edit3 className="h-3 w-3" />
                                    </Button>
                                </span>
                                <p className="text-sm font-bold text-slate-800 mt-1 truncate">{groupInfo?.name || 'Carregando...'}</p>
                            </div>
                            <div className="p-4 bg-slate-50 border rounded-xl relative">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between">
                                    Descrição
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-5 w-5 hover:bg-slate-200 text-slate-500 rounded-full"
                                        onClick={() => setIsEditDialogOpen(true)}
                                        title="Editar Nome e Descrição"
                                    >
                                        <Edit3 className="h-3 w-3" />
                                    </Button>
                                </span>
                                <p className="text-xs text-slate-600 mt-1 truncate" title={groupInfo?.description || groupInfo?.desc || 'Sem descrição'}>
                                    {groupInfo?.description || groupInfo?.desc || 'Nenhuma descrição salva'}
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 border rounded-xl">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Integrantes no WhatsApp</span>
                                <p className="text-sm font-bold text-slate-800 mt-1">
                                    {groupInfo?.size || groupInfo?.participants?.length || 0} pessoas
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 border rounded-xl">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Status da Turma</span>
                                <div className="mt-1">
                                    {isClassCompleted ? (
                                        <Badge variant="destructive" className="font-bold">Turma Concluída</Badge>
                                    ) : (
                                        <Badge className="bg-emerald-100 border border-emerald-300 text-emerald-800 hover:bg-emerald-200 font-bold">Ativa & Conectada</Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tabs de Membros Categorizados */}
                        <div className="border rounded-xl p-4 bg-muted/20">
                            <Tabs defaultValue="students">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b gap-3">
                                    <TabsList className="bg-white border">
                                        <TabsTrigger value="teachers" className="text-xs font-bold gap-1.5">
                                            <GraduationCap className="size-3.5 text-indigo-600" />
                                            Professores ({resolvedTeachers.length})
                                        </TabsTrigger>
                                        <TabsTrigger value="support" className="text-xs font-bold gap-1.5">
                                            <HandHelping className="size-3.5 text-emerald-600" />
                                            Equipe de Apoio ({resolvedSupportTeam.length})
                                        </TabsTrigger>
                                        <TabsTrigger value="students" className="text-xs font-bold gap-1.5">
                                            <Users className="size-3.5 text-blue-600" />
                                            Alunos ({resolvedStudents.length})
                                        </TabsTrigger>
                                    </TabsList>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedStudentForInvite(null);
                                            setIsInviteDialogOpen(true);
                                        }}
                                        className="h-8 text-xs font-bold gap-1.5 bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                    >
                                        <Send className="size-3" />
                                        Disparar Convite no WhatsApp dos Alunos
                                    </Button>
                                </div>

                                {/* Aba 1: Professores */}
                                <TabsContent value="teachers" className="mt-4 space-y-2">
                                    <p className="text-[11px] text-muted-foreground">
                                        Professores titulares e habilitados para a turma. Recomenda-se mantê-los como <strong>Administradores</strong> no WhatsApp.
                                    </p>
                                    {resolvedTeachers.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic py-4 text-center">Nenhum professor vinculado à turma ou ao curso.</p>
                                    ) : (
                                        resolvedTeachers.map(teacher => {
                                            const { inGroup, isAdmin, trueJid } = checkUserInGroup(teacher);
                                            const isTitular = classData.teacherId === teacher.id;

                                            return (
                                                <div key={teacher.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg border text-xs bg-white">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-slate-800">{teacher.name}</span>
                                                            {isTitular && (
                                                                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[9px] font-bold">Titular</Badge>
                                                            )}
                                                            {isAdmin && (
                                                                <Badge className="bg-amber-100 border-amber-300 text-amber-800 font-bold text-[8px] h-4 flex items-center gap-0.5">
                                                                    <Shield className="size-2.5" /> Admin
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground font-mono block">
                                                            {teacher.phone || teacher.phoneNumber || 'Sem telefone'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {inGroup ? (
                                                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px]">No Grupo</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[9px]">Não Entrou</Badge>
                                                        )}

                                                        {inGroup && (
                                                            <div className="flex items-center border-l pl-2 border-slate-100">
                                                                {isAdmin ? (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleUpdateAdminStatus(trueJid, 'demote')}
                                                                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                        title="Remover Administrador no WhatsApp"
                                                                    >
                                                                        <ShieldAlert className="size-3.5" />
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleUpdateAdminStatus(trueJid, 'promote')}
                                                                        className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                                        title="Tornar Administrador no WhatsApp"
                                                                    >
                                                                        <Shield className="size-3.5" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </TabsContent>

                                {/* Aba 2: Equipe de Apoio */}
                                <TabsContent value="support" className="mt-4 space-y-2">
                                    <p className="text-[11px] text-muted-foreground">
                                        Secretários e equipe de apoio do curso/turma responsáveis pelo acompanhamento pedagógico.
                                    </p>
                                    {resolvedSupportTeam.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic py-4 text-center">Nenhum secretário ou equipe de apoio cadastrado no curso.</p>
                                    ) : (
                                        resolvedSupportTeam.map(support => {
                                            const { inGroup, isAdmin, trueJid } = checkUserInGroup(support);

                                            return (
                                                <div key={support.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg border text-xs bg-white">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-slate-800">{support.name}</span>
                                                            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[9px] font-bold">Apoio / Secretário</Badge>
                                                            {isAdmin && (
                                                                <Badge className="bg-amber-100 border-amber-300 text-amber-800 font-bold text-[8px] h-4 flex items-center gap-0.5">
                                                                    <Shield className="size-2.5" /> Admin
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground font-mono block">
                                                            {support.phone || support.phoneNumber || 'Sem telefone'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {inGroup ? (
                                                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px]">No Grupo</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[9px]">Não Entrou</Badge>
                                                        )}

                                                        {inGroup && (
                                                            <div className="flex items-center border-l pl-2 border-slate-100">
                                                                {isAdmin ? (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleUpdateAdminStatus(trueJid, 'demote')}
                                                                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                        title="Remover Administrador no WhatsApp"
                                                                    >
                                                                        <ShieldAlert className="size-3.5" />
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleUpdateAdminStatus(trueJid, 'promote')}
                                                                        className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                                        title="Tornar Administrador no WhatsApp"
                                                                    >
                                                                        <Shield className="size-3.5" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </TabsContent>

                                {/* Aba 3: Alunos */}
                                <TabsContent value="students" className="mt-4 space-y-2">
                                    <p className="text-[11px] text-muted-foreground">
                                        Alunos matriculados na turma. Você pode enviar o convite no WhatsApp privado individualmente ou para todos os pendentes.
                                    </p>
                                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                        {resolvedStudents.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic py-4 text-center">Nenhum aluno matriculado nesta turma.</p>
                                        ) : (
                                            resolvedStudents.map(student => {
                                                const { inGroup, isAdmin } = checkUserInGroup(student);

                                                return (
                                                    <div key={student.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg border text-xs bg-white">
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-semibold text-slate-800">{student.name}</span>
                                                                {isAdmin && (
                                                                    <Badge className="bg-amber-100 border-amber-300 text-amber-800 font-bold text-[8px] h-3.5">Admin</Badge>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground font-mono block">
                                                                {student.phone || student.phoneNumber || 'Sem telefone'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isClassCompleted ? (
                                                                <Badge variant="secondary" className="text-[9px]">Turma Concluída</Badge>
                                                            ) : inGroup ? (
                                                                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px]">No Grupo</Badge>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5">
                                                                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[9px]">Pendente</Badge>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => {
                                                                            setSelectedStudentForInvite(student.id);
                                                                            setIsInviteDialogOpen(true);
                                                                        }}
                                                                        className="h-6 px-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 gap-1 rounded"
                                                                        title="Enviar link de convite no WhatsApp deste aluno"
                                                                    >
                                                                        <Send className="size-2.5" /> Enviar Convite
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </TabsContent>
                            </Tabs>
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

                        {/* Modal para Disparo de Link de Convite no Privado */}
                        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                                        <Send className="size-5 text-emerald-600" />
                                        Disparar Convite no WhatsApp
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                        Envio individualizado e seguro do link de convite oficial
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 py-3">
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-950 space-y-1">
                                        <p className="font-bold flex items-center gap-1">
                                            <Shield className="size-3.5 text-emerald-700" />
                                            Por que essa é a melhor prática?
                                        </p>
                                        <p className="text-[11px] text-emerald-800 leading-relaxed">
                                            Quando os alunos entram voluntariamente clicando no link de convite, o WhatsApp entende que é uma ação genuína do usuário, <strong>eliminando 100% dos riscos de banimento ou bloqueio</strong> da sua conta da igreja!
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-bold">Destinatários</Label>
                                            <Badge variant="outline" className="text-[10px]">
                                                {selectedStudentForInvite 
                                                    ? '1 Aluno Selecionado'
                                                    : `${pendingStudentsCount} Aluno(s) Pendente(s)`}
                                            </Badge>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            {selectedStudentForInvite 
                                                ? `Enviando para: ${resolvedStudents.find(s => s.id === selectedStudentForInvite)?.name || 'Aluno'}`
                                                : `Será enviado para todos os ${pendingStudentsCount} alunos que ainda não entraram no grupo.`}
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="custom-msg" className="text-xs font-bold">Mensagem Personalizada (Opcional)</Label>
                                        <Textarea
                                            id="custom-msg"
                                            value={customInviteMsg}
                                            onChange={e => setCustomInviteMsg(e.target.value)}
                                            placeholder={`Olá, {nome}! Tudo bem?\n\nAs aulas do curso {curso} ({turma}) vão começar!\n\nEntre no grupo oficial do WhatsApp pelo link:\n👉 {link}\n\nSeja bem-vindo(a)!`}
                                            rows={5}
                                            className="text-xs"
                                        />
                                        <span className="text-[10px] text-muted-foreground block">
                                            Tags automáticas: <code>{'{nome}'}</code>, <code>{'{curso}'}</code>, <code>{'{turma}'}</code>, <code>{'{link}'}</code>
                                        </span>
                                    </div>
                                </div>

                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline" className="font-bold text-xs">Cancelar</Button>
                                    </DialogClose>
                                    <Button
                                        onClick={handleSendInvites}
                                        disabled={isSendingInvites || (pendingStudentsCount === 0 && !selectedStudentForInvite)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                                    >
                                        {isSendingInvites ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Send className="size-3.5 mr-1.5" />}
                                        Disparar Convites Agora
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Modal para Edição Manual de Nome e Descrição */}
                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                                        <Settings className="h-5 w-5 text-emerald-600" />
                                        Ajustar Dados do Grupo
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                        Modifique o Nome e a Descrição do grupo diretamente no WhatsApp.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="group-name-input" className="text-xs font-bold">Nome do Grupo</Label>
                                        <Input 
                                            id="group-name-input" 
                                            value={editGroupName} 
                                            onChange={e => setEditGroupName(e.target.value)} 
                                            maxLength={100}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="group-desc-input" className="text-xs font-bold">Descrição do Grupo</Label>
                                        <Textarea 
                                            id="group-desc-input" 
                                            value={editGroupDesc} 
                                            onChange={e => setEditGroupDesc(e.target.value)} 
                                            rows={4}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="group-pic-file" className="text-xs font-bold">Enviar Nova Foto para o Grupo</Label>
                                        <div className="flex items-center gap-3">
                                            <Input 
                                                id="group-pic-file" 
                                                type="file" 
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file && storage) {
                                                        setIsUploadingPic(true);
                                                        const storageRef = ref(storage, `group-profiles/${classData.id}-${Date.now()}`);
                                                        const uploadTask = uploadBytesResumable(storageRef, file);
                                                        
                                                        uploadTask.on('state_changed', 
                                                            null, 
                                                            (err) => {
                                                                console.error(err);
                                                                setIsUploadingPic(false);
                                                                toast({ variant: 'destructive', title: 'Erro no Upload', description: 'Não foi possível hospedar a imagem.' });
                                                            }, 
                                                            async () => {
                                                                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                                                setEditGroupPicture(downloadURL);
                                                                setIsUploadingPic(false);
                                                                toast({ title: 'Foto Hospedada!', description: 'Foto carregada com sucesso no servidor da igreja. Clique em Salvar para enviar para o WhatsApp.' });
                                                            }
                                                        );
                                                    }
                                                }}
                                                className="cursor-pointer"
                                            />
                                            {isUploadingPic && <Loader2 className="h-4 w-4 animate-spin text-emerald-600 shrink-0" />}
                                        </div>
                                        {editGroupPicture && (
                                            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                                                ✓ Imagem hospedada e pronta para salvar
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline" className="font-bold text-xs">Cancelar</Button>
                                    </DialogClose>
                                    <Button 
                                        onClick={handleSaveManualMetadata} 
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                                        disabled={isSyncing}
                                    >
                                        {isSyncing ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : null}
                                        Salvar no WhatsApp
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
