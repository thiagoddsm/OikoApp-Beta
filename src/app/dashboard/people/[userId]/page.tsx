
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { doc, Timestamp } from 'firebase/firestore';
import { useFirebase, useDoc } from '@/firebase';
import { notFound } from 'next/navigation';
import { Person } from '@/types/person';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updatePerson } from './actions';

import {
  User, Mail, Phone, Building, Briefcase, GraduationCap, MapPin, Hash, Shield, Calendar, Edit, Loader2, Link as LinkIcon,
  Heart, Home, Cake, Info, Dna, Droplet, Star, Rss, SquareUser, Workflow
} from 'lucide-react';

// Funções de formatação e componentes de UI (mantidos como estavam)
function formatCPF(cpf: string | undefined): string {
    if (!cpf) return 'Não informado';
    const cleaned = ('' + cpf).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
    if (match) {
        return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
    }
    return cpf;
}

function formatCEP(cep: string | undefined): string {
    if (!cep) return 'Não informado';
    const cleaned = ('' + cep).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{5})(\d{3})$/);
    if (match) {
        return `${match[1]}-${match[2]}`;
    }
    return cep;
}

const InfoField = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | undefined | null }) => (
    <div className="flex items-start gap-4">
        <div className="text-muted-foreground pt-1">
            <Icon size={16} />
        </div>
        <div>
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            <p className="text-sm font-medium text-foreground">{value || 'Não informado'}</p>
        </div>
    </div>
);

function EditProfileModal({ person, isOpen, onOpenChange, onSave }: {
    person: Person;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (updatedPerson: Person) => void;
}) {
    const [editedPerson, setEditedPerson] = useState<Person>(person);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setEditedPerson(person);
    }, [person]);

    const handleChange = (path: string, value: any) => {
        setEditedPerson(prev => {
            const keys = path.split('.');
            const newPerson = JSON.parse(JSON.stringify(prev));
            let current = newPerson;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newPerson;
        });
    };
    
    const handleDateChange = (path: string, value: string) => {
        const date = value ? new Date(value) : null;
        handleChange(path, date ? Timestamp.fromDate(date) : null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await updatePerson(editedPerson);
            if (result.success) {
                onSave(editedPerson);
                toast({ title: 'Perfil Atualizado', description: 'As informações foram salvas com sucesso.' });
                onOpenChange(false);
            } else {
                throw new Error(result.message || 'Ocorreu um erro desconhecido ao salvar.');
            }
        } catch (error) {
            console.error('Failed to update person:', error);
            const errorMessage = error instanceof Error ? error.message : 'Não foi possível atualizar o perfil.';
            toast({ variant: 'destructive', title: 'Erro ao Salvar', description: errorMessage });
        } finally {
            setIsSaving(false);
        }
    };

    // O JSX do Modal é mantido, pois a lógica de UI está correta.
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Editar Perfil de {person.name}</DialogTitle>
                    <DialogDescription>Atualize as informações. Clique em salvar ao terminar.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 overflow-y-auto px-1">
                   {/* Coluna 1: Dados Pessoais */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Dados Pessoais</h4>
                        <div className='space-y-2'>
                           <Label>Nome Completo</Label>
                           <Input value={editedPerson.name || ''} onChange={(e) => handleChange('name', e.target.value)} />
                        </div>
                         <div className='space-y-2'>
                           <Label>Data de Nascimento</Label>
                            <Input type='date' value={editedPerson.birthDate ? (editedPerson.birthDate as Timestamp).toDate().toISOString().split('T')[0] : ''} onChange={(e) => handleDateChange('birthDate', e.target.value)} />
                        </div>
                         <div className='space-y-2'>
                           <Label>Gênero</Label>
                           <Select value={editedPerson.gender || ''} onValueChange={(v) => handleChange('gender', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value='Masculino'>Masculino</SelectItem><SelectItem value='Feminino'>Feminino</SelectItem></SelectContent></Select>
                        </div>
                        <div className='space-y-2'>
                            <Label>Estado Civil</Label>
                             <Select value={editedPerson.maritalStatus || ''} onValueChange={(v) => handleChange('maritalStatus', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value='Solteiro(a)'>Solteiro(a)</SelectItem><SelectItem value='Casado(a)'>Casado(a)</SelectItem><SelectItem value='Divorciado(a)'>Divorciado(a)</SelectItem><SelectItem value='Viúvo(a)'>Viúvo(a)</SelectItem></SelectContent></Select>
                        </div>
                        <div className='space-y-2'>
                           <Label>CPF</Label>
                           <Input value={editedPerson.cpf || ''} onChange={(e) => handleChange('cpf', e.target.value)} />
                        </div>
                        <div className='space-y-2'>
                            <Label>RG</Label>
                            <Input value={editedPerson.rg || ''} onChange={(e) => handleChange('rg', e.target.value)} />
                        </div>
                        <div className='space-y-2'>
                            <Label>Naturalidade</Label>
                            <Input value={editedPerson.nationality || ''} onChange={(e) => handleChange('nationality', e.target.value)} />
                        </div>
                    </div>
                    
                    {/* Coluna 2: Contatos e Endereço */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Contatos Pessoais</h4>
                        <div className='space-y-2'>
                            <Label>E-mail</Label>
                            <Input type="email" value={editedPerson.contacts?.email || ''} onChange={(e) => handleChange('contacts.email', e.target.value)} />
                        </div>
                        <div className='space-y-2'>
                            <Label>Celular</Label>
                            <Input value={editedPerson.contacts?.cellPhone || ''} onChange={(e) => handleChange('contacts.cellPhone', e.target.value)} />
                        </div>
                        <div className='space-y-2'>
                            <Label>Telefone</Label>
                            <Input value={editedPerson.contacts?.phone || ''} onChange={(e) => handleChange('contacts.phone', e.target.value)} />
                        </div>

                         <h4 className="font-semibold text-lg pt-4">Endereço Residencial</h4>
                         <div className='space-y-2'>
                            <Label>CEP</Label>
                            <Input value={editedPerson.address?.cep || ''} onChange={(e) => handleChange('address.cep', e.target.value)} />
                        </div>
                         <div className='space-y-2'>
                            <Label>Endereço</Label>
                            <Input value={editedPerson.address?.street || ''} onChange={(e) => handleChange('address.street', e.target.value)} />
                        </div>
                        <div className='grid grid-cols-2 gap-4'>
                            <div className='space-y-2'>
                                <Label>Número</Label>
                                <Input value={editedPerson.address?.number || ''} onChange={(e) => handleChange('address.number', e.target.value)} />
                            </div>
                             <div className='space-y-2'>
                                <Label>Complemento</Label>
                                <Input value={editedPerson.address?.complement || ''} onChange={(e) => handleChange('address.complement', e.target.value)} />
                            </div>
                        </div>
                        <div className='space-y-2'>
                            <Label>Bairro</Label>
                            <Input value={editedPerson.address?.neighborhood || ''} onChange={(e) => handleChange('address.neighborhood', e.target.value)} />
                        </div>
                        <div className='grid grid-cols-2 gap-4'>
                           <div className='space-y-2'>
                               <Label>Cidade</Label>
                               <Input value={editedPerson.address?.city || ''} onChange={(e) => handleChange('address.city', e.target.value)} />
                           </div>
                           <div className='space-y-2'>
                               <Label>UF</Label>
                               <Input value={editedPerson.address?.state || ''} onChange={(e) => handleChange('address.state', e.target.value)} />
                           </div>
                       </div>
                    </div>

                    {/* Coluna 3: Profissional e Igreja */}
                     <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Dados Profissionais</h4>
                         <div className='space-y-2'>
                            <Label>Escolaridade</Label>
                             <Select value={editedPerson.professional?.educationLevel || ''} onValueChange={(v) => handleChange('professional.educationLevel', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value='Fundamental Incompleto'>Fundamental Incompleto</SelectItem><SelectItem value='Fundamental Completo'>Fundamental Completo</SelectItem><SelectItem value='Médio Incompleto'>Médio Incompleto</SelectItem><SelectItem value='Médio Completo'>Médio Completo</SelectItem><SelectItem value='Superior Incompleto'>Superior Incompleto</SelectItem><SelectItem value='Superior Completo'>Superior Completo</SelectItem><SelectItem value='Pós-graduação'>Pós-graduação</SelectItem></SelectContent></Select>
                        </div>
                         <div className='space-y-2'>
                            <Label>Profissão</Label>
                            <Input value={editedPerson.professional?.profession || ''} onChange={(e) => handleChange('professional.profession', e.target.value)} />
                        </div>

                        <h4 className="font-semibold text-lg pt-4">Dados da Igreja</h4>
                         <div className='space-y-2'>
                             <Label>Código de Membro</Label>
                            <Input value={editedPerson.code || ''} onChange={(e) => handleChange('code', e.target.value)} />
                        </div>
                        <div className='space-y-2'>
                             <Label>Status na Jornada</Label>
                            <Input value={editedPerson.churchData?.integrationStatus || ''} onChange={(e) => handleChange('churchData.integrationStatus', e.target.value)} />
                        </div>
                        <div className='space-y-2'>
                            <Label>Pequeno Grupo (GC)</Label>
                            <Input value={editedPerson.gc || ''} onChange={(e) => handleChange('gc', e.target.value)} />
                        </div>

                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function PersonProfilePage({ params }: { params: { userId: string } }) {
    const { firestore } = useFirebase();
    const { userId } = params;
    const [isEditing, setIsEditing] = useState(false);
    
    // **CORREÇÃO DEFINITIVA**
    // 1. A referência só é criada se `firestore` e `userId` (como string válida) existirem.
    const personRef = useMemo(() => {
        if (firestore && typeof userId === 'string' && userId) {
            return doc(firestore, 'users', userId);
        }
        return null;
    }, [firestore, userId]);

    // 2. O hook `useDoc` recebe a referência (ou null, que ele trata de forma segura).
    const [personData, isLoading, error] = useDoc<Person>(personRef);
    
    // 3. O estado local `person` é sincronizado com o resultado do hook.
    const [person, setPerson] = useState<Person | null>(null);

    useEffect(() => {
        if (personData) {
            setPerson(personData);
        }
    }, [personData]);

    // 4. Tratamento explícito dos estados de carregamento e erro.
    if (isLoading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    // Se houver um erro na consulta, registramos e podemos mostrar uma mensagem.
    if (error) {
        console.error("Firebase error:", error);
        return <div className="text-center text-red-500">Ocorreu um erro ao carregar os dados.</div>;
    }

    // Se o carregamento terminou e não há dados, significa que o documento não foi encontrado.
    if (!isLoading && !personData) {
        notFound();
    }
    
    // Se `person` ainda não foi definido, exibe o loading para evitar erros de renderização.
    // Isso cobre o pequeno intervalo entre o `personData` chegar e o `useEffect` atualizar o estado.
    if (!person) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const getInitials = (name: string | undefined) => {
        if (!name) return '';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const handleSave = (updatedPerson: Person) => {
        setPerson(updatedPerson);
    };

    const age = person.birthDate ? new Date().getFullYear() - (person.birthDate as Timestamp).toDate().getFullYear() : null;
    
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row items-start gap-8">
            <div className="w-full lg:w-1/3 flex flex-col items-center text-center lg:items-start lg:text-left">
                <Avatar className="h-32 w-32 mb-4 ring-4 ring-primary/20 ring-offset-2 bg-background">
                    <AvatarImage src={person.photoURL} alt={person.name} />
                    <AvatarFallback className='text-4xl'>{getInitials(person.name)}</AvatarFallback>
                </Avatar>
                <h1 className="text-3xl font-bold text-foreground">{person.name}</h1>
                <p className="text-md text-muted-foreground">{person.professional?.profession || 'Profissão não informada'}</p>
                <p className="text-sm text-muted-foreground">{age ? `${age} anos` : 'Idade não informada'}</p>
                <Button className="mt-6 w-full lg:w-auto" onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" /> Editar Perfil
                </Button>
            </div>

            <div className="w-full lg:w-2/3">
                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className='grid w-full grid-cols-4'>
                        <TabsTrigger value="profile">Perfil</TabsTrigger>
                        <TabsTrigger value="address">Endereços</TabsTrigger>
                        <TabsTrigger value="professional">Profissional</TabsTrigger>
                        <TabsTrigger value="church">Jornada</TabsTrigger>
                    </TabsList>
                    
                    {/* TabsContent... (sem alterações) */}
                    <TabsContent value="profile" className='mt-6'>
                        <Card>
                            <CardHeader>
                                <CardTitle>Informações Pessoais</CardTitle>
                                <CardDescription>Dados de identificação e contato.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                                    <InfoField icon={Cake} label='Data de Nascimento' value={person.birthDate ? (person.birthDate as Timestamp).toDate().toLocaleDateString('pt-BR') : ''} />
                                    <InfoField icon={Heart} label='Estado Civil' value={person.maritalStatus} />
                                    <InfoField icon={SquareUser} label='Gênero' value={person.gender} />
                                    <InfoField icon={Info} label='CPF' value={formatCPF(person.cpf)} />
                                    <InfoField icon={Info} label='RG' value={person.rg} />
                                    <InfoField icon={Dna} label='Naturalidade' value={person.nationality} />
                                </div>
                                <Separator />
                                <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                                     <InfoField icon={Mail} label='E-mail' value={person.contacts?.email} />
                                     <InfoField icon={Phone} label='Celular' value={person.contacts?.cellPhone} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="address" className='mt-6'>
                        <Card>
                            <CardHeader><CardTitle>Endereço Residencial</CardTitle></CardHeader>
                            <CardContent className="space-y-6 pt-2">
                                <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                                    <InfoField icon={MapPin} label='CEP' value={formatCEP(person.address?.cep)} />
                                    <InfoField icon={Home} label='Endereço' value={`${person.address?.street || ''}, ${person.address?.number || ''}`} />
                                    <InfoField icon={Home} label='Bairro' value={person.address?.neighborhood} />
                                    <InfoField icon={Home} label='Cidade/UF' value={person.address?.city ? `${person.address.city} - ${person.address.state || ''}`: ''} />
                                    <InfoField icon={Home} label='Complemento' value={person.address?.complement} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                     <TabsContent value="professional" className='mt-6'>
                        <Card>
                            <CardHeader><CardTitle>Informações Profissionais</CardTitle></CardHeader>
                            <CardContent className="space-y-6 pt-2">
                               <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                                    <InfoField icon={GraduationCap} label='Escolaridade' value={person.professional?.educationLevel} />
                                    <InfoField icon={Briefcase} label='Profissão' value={person.professional?.profession} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                     <TabsContent value="church" className='mt-6'>
                        <Card>
                            <CardHeader><CardTitle>Jornada na Igreja</CardTitle></CardHeader>
                            <CardContent className="space-y-6 pt-2">
                                <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                                    <InfoField icon={Hash} label='Código de Membro' value={person.code} />
                                    <InfoField icon={Rss} label='Status na Jornada' value={person.churchData?.integrationStatus} />
                                    <InfoField icon={Workflow} label='Pequeno Grupo (GC)' value={person.gc} />
                                    <InfoField icon={Calendar} label='Data de Cadastro' value={person.churchData?.registrationDate ? (person.churchData.registrationDate as Timestamp).toDate().toLocaleDateString('pt-BR') : ''} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>

         <EditProfileModal 
            person={person} 
            isOpen={isEditing} 
            onOpenChange={setIsEditing} 
            onSave={handleSave}
        />
      </div>
    );
}
