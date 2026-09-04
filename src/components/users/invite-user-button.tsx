'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { writeBatch, collection, doc, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { firebaseConfig } from '@/firebase/config';

export function InviteUserButton({ user }: { user: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const router = useRouter();

    const handleInvite = async () => {
        if (!user.email || !firestore) return;
        setIsProcessing(true);

        const apiKey = firebaseConfig.apiKey;
        if (!apiKey) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Chave de API do Firebase não configurada.' });
            setIsProcessing(false);
            return;
        }

        try {
            // 1. Criar Auth Account via REST API
            const randomPassword = Math.random().toString(36).slice(-8) + "A1!";
            const createRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, password: randomPassword, returnSecureToken: true })
            });
            const createData = await createRes.json();

            if (createData.error) {
                if (createData.error.message === 'EMAIL_EXISTS') {
                    toast({ 
                        variant: 'destructive', 
                        title: 'E-mail já cadastrado!', 
                        description: 'O usuário já criou uma conta ou logou com o Google. Vá em "Unificar Cadastros" para fundir os dados.' 
                    });
                } else {
                    toast({ variant: 'destructive', title: 'Erro', description: createData.error.message });
                }
                setIsProcessing(false);
                return;
            }

            const newUid = createData.localId;

            // 2. Realizar Deep Merge (mesma lógica do MergeUsersManager)
            const batch = writeBatch(firestore);
            const oldId = user.id;

            // 2.1 Copiar os dados para o novo UID (e remover a chave id do body)
            const newUserData = { ...user };
            delete newUserData.id;
            batch.set(doc(firestore, 'users', newUid), newUserData);

            // 2.2 Atualizar Turmas (Classes)
            const classesSnap = await getDocs(collection(firestore, 'classes'));
            classesSnap.docs.forEach(d => {
                const data = d.data();
                let needsUpdate = false;
                const updates: any = {};

                if (data.teacherId === oldId) { updates.teacherId = newUid; needsUpdate = true; }

                if (data.students && Array.isArray(data.students) && data.students.includes(oldId)) {
                    updates.students = data.students.map((id: string) => id === oldId ? newUid : id);
                    needsUpdate = true;
                }

                if (data.attendance && Array.isArray(data.attendance)) {
                    let attendanceChanged = false;
                    const newAttendance = data.attendance.map((record: any) => {
                        let recordChanged = false;
                        const newRecord = { ...record };

                        if (record.presentStudentIds?.includes(oldId)) {
                            newRecord.presentStudentIds = record.presentStudentIds.map((id: string) => id === oldId ? newUid : id);
                            recordChanged = true;
                        }

                        if (record.onlineStudentIds?.includes(oldId)) {
                            newRecord.onlineStudentIds = record.onlineStudentIds.map((id: string) => id === oldId ? newUid : id);
                            recordChanged = true;
                        }

                        if (record.repositions?.some((r: any) => r.studentId === oldId)) {
                            newRecord.repositions = record.repositions.map((r: any) => r.studentId === oldId ? { ...r, studentId: newUid } : r);
                            recordChanged = true;
                        }

                        if (recordChanged) attendanceChanged = true;
                        return newRecord;
                    });
                    if (attendanceChanged) { updates.attendance = newAttendance; needsUpdate = true; }
                }
                if (needsUpdate) batch.update(d.ref, updates);
            });

            // 2.3 Atualizar Células (Cells)
            const cellsSnap = await getDocs(collection(firestore, 'cells'));
            cellsSnap.docs.forEach(d => {
                const data = d.data();
                let needsUpdate = false;
                const updates: any = {};

                if (data.leaderId === oldId) { updates.leaderId = newUid; needsUpdate = true; }
                if (data.hostId === oldId) { updates.hostId = newUid; needsUpdate = true; }
                
                if (data.membros && Array.isArray(data.membros) && data.membros.includes(oldId)) {
                    updates.membros = data.membros.map((id: string) => id === oldId ? newUid : id);
                    needsUpdate = true;
                }
                if (data.members && Array.isArray(data.members) && data.members.includes(oldId)) {
                    updates.members = data.members.map((id: string) => id === oldId ? newUid : id);
                    needsUpdate = true;
                }
                if (needsUpdate) batch.update(d.ref, updates);
            });

            // 2.4 Apagar o Documento Antigo
            batch.delete(doc(firestore, 'users', oldId));

            await batch.commit();

            // 3. Disparar e-mail de Redefinição de Senha
            const resetRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestType: "PASSWORD_RESET", email: user.email })
            });

            if (!resetRes.ok) {
                toast({ variant: 'destructive', title: 'Sucesso Parcial', description: 'Conta migrada, mas houve um erro ao enviar o e-mail de senha. Tente enviar pelo painel do Firebase.' });
            } else {
                toast({ title: 'Sucesso!', description: 'O e-mail de criação de senha foi enviado para ' + user.email });
            }

            setIsOpen(false);
            // Redireciona para o novo ID para que a tela não quebre!
            router.push(`/dashboard/people/${newUid}`);

        } catch (error: any) {
            console.error("Invite error", error);
            toast({ variant: 'destructive', title: 'Erro Crítico', description: 'Ocorreu um erro inesperado ao gerar o convite.' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <Button 
                variant="outline" 
                size="sm" 
                className="h-10 px-4 rounded-xl border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold"
                onClick={() => setIsOpen(true)}
            >
                <KeyRound className="size-4 mr-2" /> Liberar Acesso
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <KeyRound className="size-5 text-indigo-500" />
                            Liberar Acesso ao App
                        </DialogTitle>
                        <DialogDescription>
                            Gere o login para o usuário sem perder o histórico.
                        </DialogDescription>
                    </DialogHeader>

                    {!user.email ? (
                        <div className="p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-sm font-medium">
                            <p>Este usuário não possui um e-mail cadastrado em seu perfil.</p>
                            <p className="mt-2 text-xs">Vá em <b>Editar Perfil</b>, preencha o campo de e-mail e tente novamente.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 text-sm text-slate-700">
                            <p>
                                Ao confirmar, o sistema irá:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-xs">
                                <li>Criar uma conta oficial na plataforma invisivelmente.</li>
                                <li>Transferir todo o histórico (turmas, chamadas, células) deste perfil para a nova conta.</li>
                                <li>Apagar o registro obsoleto de segurança.</li>
                                <li>Enviar um link de "Redefinir Senha" para <b>{user.email}</b>.</li>
                            </ul>
                            <p className="font-bold text-indigo-700 text-xs mt-4">
                                Você será redirecionado para o novo ID do usuário logo em seguida.
                            </p>
                        </div>
                    )}

                    <DialogFooter className="mt-6">
                        <DialogClose asChild>
                            <Button variant="outline" disabled={isProcessing}>Cancelar</Button>
                        </DialogClose>
                        <Button 
                            onClick={handleInvite} 
                            disabled={!user.email || isProcessing}
                            className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                        >
                            {isProcessing ? (
                                <><Loader2 className="size-4 mr-2 animate-spin" /> Processando Migração...</>
                            ) : (
                                <><Mail className="size-4 mr-2" /> Enviar Convite</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
