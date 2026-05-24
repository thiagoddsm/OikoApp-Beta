
'use client';

import React, { useState, useEffect } from 'react';
import { addDocumentNonBlocking, FirebaseServicesAndUser } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, CheckCircle, Wallet, DollarSign, Receipt, Info, HeartHandshake, Paperclip } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { useFirebase } from '@/firebase';


function PublicFinanceRequestForm({ firebase }: { firebase: FirebaseServicesAndUser }) {
    const { firestore, storage } = firebase;
    const { toast } = useToast();
    
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const [formData, setFormData] = useState({
        requesterName: '',
        phone: '',
        email: '',
        category: 'Ministério',
        description: '',
        amount: '',
        objective: 'reembolso' as 'reembolso' | 'pagamento' | 'prestacao_contas',
        pixKey: '',
        dueDate: '',
        purchaseLink: '',
    });

    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            dueDate: new Date().toISOString().split('T')[0]
        }));
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.requesterName || !formData.email || !formData.amount || !firestore) return;
        
        if (attachmentFile && !storage) {
            toast({ variant: 'destructive', title: "Erro de Configuração", description: "O serviço de armazenamento não está disponível." });
            return;
        }

        setIsSaving(true);
        try {
            let attachmentUrl = '';
            if (attachmentFile && storage) {
                const filePath = `finance-attachments/${Date.now()}-${attachmentFile.name}`;
                const fileRef = ref(storage, filePath);
                await uploadBytes(fileRef, attachmentFile);
                attachmentUrl = await getDownloadURL(fileRef);
            }

            await addDocumentNonBlocking(collection(firestore, 'finance_requests'), {
                ...formData,
                amount: Number(formData.amount),
                status: 'pending',
                createdAt: Timestamp.now(),
                attachmentUrl,
            });
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Ocorreu uma falha técnica. Tente novamente." });
        } finally {
            setIsSaving(false);
        }
    };

    if (success) {
        return (
            <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-20 px-4 flex items-center justify-center">
                <Card className="max-w-md w-full text-center p-8 animate-in zoom-in-95 duration-500">
                    <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Solicitação Enviada!</h2>
                    <p className="text-muted-foreground mb-8">
                        Protocolamos sua solicitação financeira com sucesso. Ela será analisada pela tesouraria da IBM em breve.
                    </p>
                    <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-bold">Enviar Outra</Button>
                </Card>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-20 px-4">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <Logo className="size-12 text-primary mx-auto mb-4" />
                    <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Solicitação Financeira</h1>
                    <p className="text-muted-foreground text-sm md:text-lg">Portal oficial para pedidos de reembolso, pagamentos e prestação de contas dos ministérios IBM.</p>
                </div>

                <Card className="shadow-2xl border-none overflow-hidden rounded-[2rem]">
                    <CardHeader className="bg-primary/5 p-8 border-b">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white rounded-2xl shadow-sm text-primary">
                                <Wallet size={24} />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold">Formulário de Protocolo</CardTitle>
                                <CardDescription>Preencha os dados com atenção para agilizar a análise.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <form onSubmit={handleSave}>
                        <CardContent className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Seu Nome Completo *</Label>
                                    <Input required value={formData.requesterName} onChange={e => setFormData(p => ({...p, requesterName: e.target.value}))} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Seu E-mail *</Label>
                                    <Input required type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Celular/WhatsApp</Label>
                                    <Input value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Objetivo *</Label>
                                    <Select value={formData.objective} onValueChange={(v: any) => setFormData(p => ({...p, objective: v}))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="reembolso">Reembolso</SelectItem>
                                            <SelectItem value="pagamento">Solicitar Pagamento</SelectItem>
                                            <SelectItem value="prestacao_contas">Prestação de Contas</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Ministério / Categoria</Label>
                                    <Input value={formData.category} onChange={e => setFormData(p => ({...p, category: e.target.value}))} placeholder="Ex: Louvor, Mídia, Kids..." />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Valor (R$) *</Label>
                                    <Input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData(p => ({...p, amount: e.target.value}))} placeholder="0,00" className="text-lg font-bold text-primary" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground">Descrição da Despesa / Justificativa *</Label>
                                <Textarea required value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} rows={4} placeholder="Descreva para que serve este recurso ou o que foi comprado..." />
                            </div>

                            {(formData.objective === 'reembolso' || formData.objective === 'pagamento') && (
                                <div className="p-6 bg-slate-50 border-2 border-dashed rounded-2xl space-y-4">
                                    <Label className="text-xs font-black uppercase text-primary flex items-center gap-2">
                                        <DollarSign size={14}/> Dados para Transferência (PIX)
                                    </Label>
                                    <Input value={formData.pixKey} onChange={e => setFormData(p => ({...p, pixKey: e.target.value}))} placeholder="Chave PIX (CPF, Celular, Email...)" className="bg-white" />
                                    <p className="text-[10px] text-muted-foreground italic leading-tight">Certifique-se que a chave informada está correta para evitarmos atrasos no seu repasse.</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Data para Pagamento</Label>
                                    <Input type="date" value={formData.dueDate} onChange={e => setFormData(p => ({...p, dueDate: e.target.value}))} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Link de Compra / Referência</Label>
                                    <Input type="url" value={formData.purchaseLink} onChange={e => setFormData(p => ({...p, purchaseLink: e.target.value}))} placeholder="https://..." />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1.5"><Paperclip size={12}/> Anexar Comprovante / Nota Fiscal</Label>
                                <Input type="file" onChange={(e) => setAttachmentFile(e.target.files ? e.target.files[0] : null)} className="pt-2 text-xs h-auto bg-white" />
                                {attachmentFile && <p className="text-xs text-muted-foreground italic mt-1">Arquivo selecionado: {attachmentFile.name}</p>}
                            </div>

                            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
                                <Info className="size-5 text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                                    Ao enviar, sua solicitação será protocolada e passará por análise. 
                                    Mantenha seus recibos originais guardados para futura entrega física à tesouraria, se necessário.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="p-8 bg-muted/20 flex flex-col gap-4">
                            <Button type="submit" disabled={isSaving} className="w-full h-14 font-black text-base uppercase tracking-widest shadow-xl">
                                {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2" />}
                                Protocolar Solicitação
                            </Button>
                            <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-tighter">Igreja Batista da Manhã • Gestão de Recursos</p>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </main>
    );
}

export default function PublicFinanceRequestPage() {
    const firebase = useFirebase();

    if (!firebase || !firebase.firestore || !firebase.storage) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-[#F8F9FA] space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm font-medium">Carregando formulário...</p>
            </div>
        );
    }

    return <PublicFinanceRequestForm firebase={firebase} />;
}
