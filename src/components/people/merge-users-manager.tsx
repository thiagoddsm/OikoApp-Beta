'use client';
import React, { useMemo, useState } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { writeBatch, collection, doc, getDocs } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { formatPhone, formatCPF } from '@/lib/utils';

type User = {
    id: string;
    name: string;
    email?: string;
    phone?: string | number;
    cpf?: string;
    avatar?: string;
    [key: string]: any;
};

type DuplicateGroup = {
    reason: string;
    users: User[];
};

function normalizeString(str?: string) {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function normalizeNumber(num?: string | number) {
    if (!num) return '';
    return String(num).replace(/\D/g, '');
}

export function MergeUsersManager() {
    const { users, isLoading } = useVolunteering();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
    const [primaryId, setPrimaryId] = useState<string>('');
    const [fieldSelections, setFieldSelections] = useState<Record<string, string>>({});

    const duplicateGroups = useMemo(() => {
        // ... (resto do memo inalterado)
        if (!users) return [];
        const groups: DuplicateGroup[] = [];
        const processedIds = new Set<string>();

        users.forEach((user1, i) => {
            if (processedIds.has(user1.id)) return;

            const duplicates = [user1];
            let reason = '';

            for (let j = i + 1; j < users.length; j++) {
                const user2 = users[j];
                if (processedIds.has(user2.id)) continue;

                const email1 = normalizeString(user1.email);
                const email2 = normalizeString(user2.email);
                const phone1 = normalizeNumber(user1.phone);
                const phone2 = normalizeNumber(user2.phone);
                const cpf1 = normalizeNumber(user1.cpf);
                const cpf2 = normalizeNumber(user2.cpf);
                const name1 = normalizeString(user1.name);
                const name2 = normalizeString(user2.name);

                if (email1 && email1 === email2) {
                    duplicates.push(user2);
                    reason = 'Email igual';
                } else if (cpf1 && cpf1 === cpf2) {
                    duplicates.push(user2);
                    reason = 'CPF igual';
                } else if (phone1 && phone1 === phone2 && phone1.length >= 10) {
                    duplicates.push(user2);
                    reason = 'Telefone igual';
                } else if (name1 && name1 === name2 && name1.length > 5) {
                    duplicates.push(user2);
                    reason = 'Nome idêntico';
                }
            }

            if (duplicates.length > 1) {
                duplicates.forEach(d => processedIds.add(d.id));
                groups.push({ reason, users: duplicates });
            }
        });

        return groups;
    }, [users]);

    const handleOpenMerge = (group: DuplicateGroup) => {
        setSelectedGroup(group);
        setPrimaryId(group.users[0].id);
        setFieldSelections({
            name: group.users[0].id,
            email: group.users[0].id,
            phone: group.users[0].id,
            cpf: group.users[0].id,
        });
    };

    const handleMergeConfirm = async () => {
        if (!selectedGroup || !primaryId || !firestore) return;
        setIsProcessing(true);

        const secondaryIds = selectedGroup.users.filter(u => u.id !== primaryId).map(u => u.id);
        const primaryUser = selectedGroup.users.find(u => u.id === primaryId)!;

        // Construir os dados mesclados finais
        const mergedData: any = { ...primaryUser };
        
        // Aplicar as seleções manuais do usuário (apenas os 4 campos mostrados na tela)
        ['name', 'email', 'phone', 'cpf'].forEach(field => {
            const selectedUserId = fieldSelections[field];
            if (selectedUserId && selectedUserId !== primaryId) {
                const selectedUser = selectedGroup.users.find(u => u.id === selectedUserId);
                if (selectedUser && selectedUser[field]) {
                    mergedData[field] = selectedUser[field];
                }
            }
        });

        // PREENCHIMENTO AUTOMÁTICO DE DADOS FALTANTES:
        // O que o primary não tiver, ele herda automaticamente dos perfis secundários!
        selectedGroup.users.forEach(secUser => {
            if (secUser.id === primaryId) return;
            Object.keys(secUser).forEach(key => {
                // Não sobrescreve os campos que o usuário já escolheu manualmente ou IDs
                if (!['id', 'name', 'email', 'phone', 'cpf'].includes(key)) {
                    // Se o mergedData tem o campo vazio/nulo, copiamos do perfil secundário
                    const isMergedDataEmpty = mergedData[key] === undefined || mergedData[key] === null || mergedData[key] === '';
                    if (isMergedDataEmpty && secUser[key] !== undefined && secUser[key] !== null) {
                        mergedData[key] = secUser[key];
                    }
                }
            });
        });

        // Remove undefined fields and ID
        const finalDataToUpdate = { ...mergedData };
        delete finalDataToUpdate.id;
        Object.keys(finalDataToUpdate).forEach(key => finalDataToUpdate[key] === undefined && delete finalDataToUpdate[key]);

        try {
            const batch = writeBatch(firestore);

            // 1. Update Primary User
            batch.set(doc(firestore, 'users', primaryId), finalDataToUpdate, { merge: true });

            // 2. Update Classes
            const classesSnap = await getDocs(collection(firestore, 'classes'));
            classesSnap.docs.forEach(d => {
                const data = d.data();
                let needsUpdate = false;
                const updates: any = {};

                if (secondaryIds.includes(data.teacherId)) {
                    updates.teacherId = primaryId;
                    needsUpdate = true;
                }

                if (data.students && Array.isArray(data.students)) {
                    const hasSecondary = data.students.some((id: string) => secondaryIds.includes(id));
                    if (hasSecondary) {
                        const newStudents = new Set(data.students.filter((id: string) => !secondaryIds.includes(id)));
                        newStudents.add(primaryId);
                        updates.students = Array.from(newStudents);
                        needsUpdate = true;
                    }
                }

                if (data.attendance && Array.isArray(data.attendance)) {
                    let attendanceChanged = false;
                    const newAttendance = data.attendance.map((record: any) => {
                        let recordChanged = false;
                        const newRecord = { ...record };

                        if (record.presentStudentIds && Array.isArray(record.presentStudentIds)) {
                            if (record.presentStudentIds.some((id: string) => secondaryIds.includes(id))) {
                                const newPresent = new Set(record.presentStudentIds.filter((id: string) => !secondaryIds.includes(id)));
                                newPresent.add(primaryId);
                                newRecord.presentStudentIds = Array.from(newPresent);
                                recordChanged = true;
                            }
                        }

                        if (record.onlineStudentIds && Array.isArray(record.onlineStudentIds)) {
                            if (record.onlineStudentIds.some((id: string) => secondaryIds.includes(id))) {
                                const newOnline = new Set(record.onlineStudentIds.filter((id: string) => !secondaryIds.includes(id)));
                                newOnline.add(primaryId);
                                newRecord.onlineStudentIds = Array.from(newOnline);
                                recordChanged = true;
                            }
                        }

                        if (recordChanged) attendanceChanged = true;
                        return newRecord;
                    });

                    if (attendanceChanged) {
                        updates.attendance = newAttendance;
                        needsUpdate = true;
                    }
                }

                if (needsUpdate) {
                    batch.update(d.ref, updates);
                }
            });

            // 3. Update Cells
            const cellsSnap = await getDocs(collection(firestore, 'cells'));
            cellsSnap.docs.forEach(d => {
                const data = d.data();
                let needsUpdate = false;
                const updates: any = {};

                if (secondaryIds.includes(data.leaderId)) {
                    updates.leaderId = primaryId;
                    needsUpdate = true;
                }
                if (secondaryIds.includes(data.hostId)) {
                    updates.hostId = primaryId;
                    needsUpdate = true;
                }
                if (data.membros && Array.isArray(data.membros)) {
                    const hasSecondary = data.membros.some((id: string) => secondaryIds.includes(id));
                    if (hasSecondary) {
                        const newMembers = new Set(data.membros.filter((id: string) => !secondaryIds.includes(id)));
                        newMembers.add(primaryId);
                        updates.membros = Array.from(newMembers);
                        needsUpdate = true;
                    }
                }
                if (data.members && Array.isArray(data.members)) {
                    const hasSecondary = data.members.some((id: string) => secondaryIds.includes(id));
                    if (hasSecondary) {
                        const newMembers = new Set(data.members.filter((id: string) => !secondaryIds.includes(id)));
                        newMembers.add(primaryId);
                        updates.members = Array.from(newMembers);
                        needsUpdate = true;
                    }
                }

                if (needsUpdate) {
                    batch.update(d.ref, updates);
                }
            });

            // 4. Delete Secondary Accounts
            secondaryIds.forEach(id => {
                batch.delete(doc(firestore, 'users', id));
            });

            await batch.commit();

            toast({ title: 'Sucesso!', description: 'Usuários unificados com sucesso.' });
            setSelectedGroup(null);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Ocorreu um erro ao unificar os cadastros.' });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black uppercase italic tracking-tighter">Duplicatas Encontradas</h3>
                    <p className="text-sm text-muted-foreground">O sistema encontrou {duplicateGroups.length} possíveis agrupamentos duplicados.</p>
                </div>
            </div>

            {duplicateGroups.length === 0 ? (
                <Card className="border-dashed bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                        <CheckCircle2 className="size-12 text-emerald-500" />
                        <div>
                            <p className="font-bold">Nenhuma duplicata encontrada!</p>
                            <p className="text-sm text-muted-foreground">O cadastro parece estar limpo e organizado.</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {duplicateGroups.map((group, idx) => (
                        <Card key={idx} className="border-indigo-100 shadow-sm">
                            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-black uppercase">
                                        Motivo: {group.reason}
                                    </Badge>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {group.users.map((u, i) => (
                                            <React.Fragment key={u.id}>
                                                <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-xl border">
                                                    <Avatar className="size-8">
                                                        <AvatarImage src={PlaceHolderImages.find(p => p.id === u.avatar)?.imageUrl} />
                                                        <AvatarFallback>{u.name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="text-sm">
                                                        <p className="font-bold leading-none">{u.name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{u.email || formatPhone(u.phone)}</p>
                                                    </div>
                                                </div>
                                                {i < group.users.length - 1 && <span className="text-muted-foreground font-bold text-lg">+</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                                <Button onClick={() => handleOpenMerge(group)} className="shrink-0 font-bold w-full md:w-auto">
                                    <Wand2 className="mr-2 size-4" /> Revisar e Unificar
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {selectedGroup && (
                <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-indigo-600 flex items-center gap-2">
                                <Wand2 className="size-5" /> Assistente de Unificação
                            </DialogTitle>
                            <DialogDescription>
                                Escolha a conta principal. O histórico das demais contas (turmas, células) será transferido para ela.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase tracking-widest text-primary">1. Selecione a Conta Principal</Label>
                                <RadioGroup value={primaryId} onValueChange={setPrimaryId} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedGroup.users.map(u => (
                                        <div key={u.id}>
                                            <RadioGroupItem value={u.id} id={`primary-${u.id}`} className="peer sr-only" />
                                            <Label
                                                htmlFor={`primary-${u.id}`}
                                                className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:bg-indigo-50 cursor-pointer"
                                            >
                                                <Avatar className="size-12 mb-2">
                                                    <AvatarImage src={PlaceHolderImages.find(p => p.id === u.avatar)?.imageUrl} />
                                                    <AvatarFallback>{u.name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="text-center w-full space-y-1">
                                                    <p className="font-bold text-sm truncate">{u.name}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{u.email || 'Sem email'}</p>
                                                    <p className="text-[10px] text-muted-foreground">{formatPhone(u.phone) || 'Sem telefone'}</p>
                                                    <p className="text-[10px] text-muted-foreground">CPF: {formatCPF(u.cpf) || 'Não inf.'}</p>
                                                    <Badge variant="outline" className="mt-2 text-[9px] uppercase font-black opacity-50">ID: {u.id.substring(0, 8)}</Badge>
                                                </div>
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <AlertTriangle className="size-4 text-amber-500" /> 2. Resolver Conflitos de Dados
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Por padrão, os dados da Conta Principal serão mantidos. Se houver alguma informação melhor nas contas secundárias, selecione-a abaixo. Os dados não listados aqui serão mesclados automaticamente.
                                </p>
                                
                                <div className="space-y-4">
                                    {['name', 'email', 'phone', 'cpf'].map(field => {
                                        // Verifica se há divergência neste campo
                                        const uniqueValues = new Set(selectedGroup.users.map(u => String(u[field] || '')).filter(v => v !== ''));
                                        if (uniqueValues.size <= 1) return null; // Não há conflito real

                                        const fieldLabels: any = { name: 'Nome Completo', email: 'E-mail', phone: 'Telefone', cpf: 'CPF' };

                                        return (
                                            <div key={field} className="bg-slate-50 p-3 rounded-xl border">
                                                <Label className="text-[10px] uppercase font-black text-slate-500">{fieldLabels[field]}</Label>
                                                <RadioGroup 
                                                    value={fieldSelections[field]} 
                                                    onValueChange={(val) => setFieldSelections(prev => ({ ...prev, [field]: val }))}
                                                    className="flex flex-col gap-2 mt-2"
                                                >
                                                    {selectedGroup.users.filter(u => u[field]).map(u => (
                                                        <div key={u.id} className="flex items-center space-x-2">
                                                            <RadioGroupItem value={u.id} id={`field-${field}-${u.id}`} />
                                                            <Label htmlFor={`field-${field}-${u.id}`} className="text-sm font-medium cursor-pointer">
                                                                {field === 'phone' ? formatPhone(u[field]) : field === 'cpf' ? formatCPF(u[field]) : u[field]}
                                                                <span className="text-[10px] text-muted-foreground ml-2">(Perfil: {u.name})</span>
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>

                        <DialogFooter className="border-t pt-4">
                            <Button variant="outline" onClick={() => setSelectedGroup(null)}>Cancelar</Button>
                            <Button onClick={handleMergeConfirm} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700 font-bold">
                                {isProcessing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Wand2 className="mr-2 size-4" />}
                                Confirmar Unificação Definitiva
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
