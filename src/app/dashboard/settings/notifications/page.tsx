'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function NotificationSettingsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [apiToken, setApiToken] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!firestore) return;

        const fetchConfig = async () => {
            setIsLoading(true);
            const configRef = doc(firestore, 'config', 'notifications');
            try {
                const docSnap = await getDoc(configRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setApiToken(data.apiToken || '');
                }
            } catch (error) {
                console.error("Error fetching notification config:", error);
                toast({ title: "Erro", description: "Não foi possível carregar as configurações.", variant: "destructive" });
            }
            setIsLoading(false);
        };

        fetchConfig();
    }, [firestore, toast]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!apiToken) {
            toast({ title: "Campo Obrigatório", description: "Por favor, insira o Token da API.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        const configRef = doc(firestore, 'config', 'notifications');
        try {
            await setDoc(configRef, { apiToken }, { merge: true });
            toast({ title: "Sucesso!", description: "Configurações salvas com sucesso." });
        } catch (error) {
            console.error("Error saving notification config:", error);
            toast({ title: "Erro", description: "Não foi possível salvar as configurações.", variant: "destructive" });
        }
        setIsSaving(false);
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Configuração do Gateway de WhatsApp</CardTitle>
                    <CardDescription>
                        Insira a credencial da sua instância da api-wa.me. Esta chave é necessária para o envio de notificações.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="apiToken">API Token (Chave)</Label>
                                <Input 
                                    id="apiToken" 
                                    type="password" 
                                    value={apiToken} 
                                    onChange={(e) => setApiToken(e.target.value)} 
                                    placeholder="Cole o seu Token da API aqui"
                                    required
                                />
                            </div>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                                Salvar Configurações
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
