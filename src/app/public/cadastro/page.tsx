'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Logo } from '@/components/icons';
import { Loader2, ArrowRight, CheckCircle, Sparkles, User, Home, Users, Heart, Compass, Car, HandHelping } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { verifyEmailRegistered, savePublicRegistration, getPublicFormOptions } from './actions';
import { GooglePlacesAutocomplete } from '@/components/common/google-places-autocomplete';

export default function PublicCadastroPage() {
    const { toast } = useToast();
    
    // States
    const [step, setStep] = useState<'email' | 'form' | 'success'>('email');
    const [email, setEmail] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const [cells, setCells] = useState<{ id: string; nome: string }[]>([]);
    const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
    
    // Form fields
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        cpf: '',
        dataNascimento: '',
        estadoCivil: '',
        sexo: '',
        escolaridade: '',
        profissao: '',
        addressCep: '',
        addressStreet: '',
        conjuge: '',
        temFilhos: 'nao',
        idadeFilhos: '',
        comoConheceu: '',
        nomeConvidou: '',
        batizado: 'nao',
        dataBatismo: '',
        igrejaBatismo: '',
        membroAntigo: 'nao',
        igrejaAntiga: '',
        veiculoPlaca: '',
        veiculoMarca: '',
        veiculoModelo: '',
        veiculoCor: '',
        celulaId: '',
        serviceAreaId: '',
    });

    useEffect(() => {
        async function fetchOptions() {
            const res = await getPublicFormOptions();
            setCells(res.cells || []);
            setAreas(res.areas || []);
        }
        fetchOptions();
    }, []);

    const handleEmailCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsChecking(true);
        const result = await verifyEmailRegistered(email);
        setIsChecking(false);

        if (result.error) {
            toast({ variant: 'destructive', title: 'Erro', description: result.error });
            return;
        }

        if (result.found && result.userData) {
            setUserId(result.userId);
            // Mesclar dados garantindo valores padrão
            setFormData({
                name: result.userData.name || '',
                phone: result.userData.phone || '',
                cpf: result.userData.cpf || '',
                dataNascimento: result.userData.dataNascimento || '',
                estadoCivil: result.userData.estadoCivil || '',
                sexo: result.userData.sexo || '',
                escolaridade: result.userData.escolaridade || '',
                profissao: result.userData.profissao || '',
                addressCep: result.userData.addressCep || '',
                addressStreet: result.userData.addressStreet || '',
                conjuge: result.userData.conjuge || '',
                temFilhos: result.userData.temFilhos || 'nao',
                idadeFilhos: result.userData.idadeFilhos || '',
                comoConheceu: result.userData.comoConheceu || '',
                nomeConvidou: result.userData.nomeConvidou || '',
                batizado: result.userData.batizado || 'nao',
                dataBatismo: result.userData.dataBatismo || '',
                igrejaBatismo: result.userData.igrejaBatismo || '',
                membroAntigo: result.userData.membroAntigo || 'nao',
                igrejaAntiga: result.userData.igrejaAntiga || '',
                veiculoPlaca: result.userData.veiculoPlaca || '',
                veiculoMarca: result.userData.veiculoMarca || '',
                veiculoModelo: result.userData.veiculoModelo || '',
                veiculoCor: result.userData.veiculoCor || '',
                celulaId: result.userData.celulaId || '',
                serviceAreaId: result.userData.serviceAreaId || '',
            });
            toast({
                title: "Cadastro Localizado!",
                description: "Preenchemos seus dados salvos. Faça as atualizações que desejar e clique em Salvar."
            });
        } else {
            setUserId(undefined);
            setFormData({
                name: '',
                phone: '',
                cpf: '',
                dataNascimento: '',
                estadoCivil: '',
                sexo: '',
                escolaridade: '',
                profissao: '',
                addressCep: '',
                addressStreet: '',
                conjuge: '',
                temFilhos: 'nao',
                idadeFilhos: '',
                comoConheceu: '',
                nomeConvidou: '',
                batizado: 'nao',
                dataBatismo: '',
                igrejaBatismo: '',
                membroAntigo: 'nao',
                igrejaAntiga: '',
                veiculoPlaca: '',
                veiculoMarca: '',
                veiculoModelo: '',
                veiculoCor: '',
                celulaId: '',
                serviceAreaId: '',
            });
            toast({
                title: "Novo Cadastro!",
                description: "Preencha o formulário abaixo para registrar seus dados no sistema."
            });
        }
        setStep('form');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.phone.trim()) {
            toast({ variant: 'destructive', title: 'Campos Obrigatórios', description: 'Por favor, preencha nome e WhatsApp.' });
            return;
        }

        setIsSaving(true);
        try {
            const result = await savePublicRegistration({
                userId,
                email,
                ...formData
            });
            
            if (result.success) {
                setStep('success');
            } else {
                toast({ variant: 'destructive', title: 'Erro ao Salvar', description: 'Ocorreu uma falha ao enviar os dados.' });
            }
        } catch (error: any) {
            console.error("Save error client-side:", error);
            toast({ variant: 'destructive', title: 'Erro ao Salvar', description: error.message || 'Ocorreu uma falha ao enviar os dados.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddressSelect = (place: any) => {
        let cep = '';
        let street = place.formatted_address || '';
        
        if (place.address_components) {
            for (const component of place.address_components) {
                if (component.types.includes('postal_code')) {
                    cep = component.long_name.replace(/\D/g, '');
                }
            }
        }
        
        setFormData(prev => ({
            ...prev,
            addressStreet: street,
            addressCep: cep || prev.addressCep
        }));
    };

    if (step === 'success') {
        return (
            <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-500 bg-white p-10 rounded-[2.5rem] border shadow-2xl">
                    <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
                        Cadastro<br />Concluído!
                    </h2>
                    <p className="text-muted-foreground font-medium text-sm">
                        Seus dados foram processados com sucesso no sistema Oiko. Obrigado por manter seu perfil atualizado!
                    </p>
                    <Button onClick={() => window.location.reload()} className="w-full font-bold h-12 rounded-xl">
                        Voltar ao Início
                    </Button>
                </div>
            </main>
        );
    }

    const showConjuge = formData.estadoCivil === 'Casado(a)' || formData.estadoCivil === 'União Estável';

    return (
        <main className="min-h-screen bg-[#F8F9FA] py-16 px-4">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center space-y-4 mb-2">
                    <img 
                      src="https://firebasestorage.googleapis.com/v0/b/studio-1424813022-71754.firebasestorage.app/o/C%C3%B3pia%20de%20LOGO%20IBM%20BRANCO.PNG?alt=media&token=85d35afe-f7f6-40d6-a9cd-c138c6a326fa" 
                      alt="Logo IBM" 
                      className="h-12 w-auto object-contain brightness-0 mx-auto mb-2"
                    />
                    <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                        Atualização Cadastral
                    </h1>
                </div>

                {step === 'email' ? (
                    <Card className="shadow-xl border-dashed border-2 overflow-hidden rounded-[2.5rem] bg-white">
                        <CardHeader className="bg-primary/5 p-8 border-b text-center">
                            <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Informe seu E-mail</CardTitle>
                            <CardDescription>Vamos verificar se você já tem um cadastro ativo para podermos atualizar.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <form onSubmit={handleEmailCheck} className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">E-mail Principal</Label>
                                    <Input
                                        required
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="h-14 rounded-2xl text-lg font-medium border-slate-200"
                                    />
                                </div>
                                <Button disabled={isChecking || !email} className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl">
                                    {isChecking ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />}
                                    Verificar E-mail
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="shadow-2xl border overflow-hidden rounded-[2.5rem] bg-white animate-in slide-in-from-bottom-4 duration-500">
                        <CardHeader className="bg-primary/5 p-8 border-b">
                            {userId ? (
                                <div className="flex items-center gap-3">
                                    <Sparkles className="size-6 text-primary animate-pulse" />
                                    <div>
                                        <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Atualizar Perfil</CardTitle>
                                        <CardDescription>Localizamos seus dados. Edite o que for necessário abaixo.</CardDescription>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Novo Cadastro</CardTitle>
                                    <CardDescription>Informe seus dados completos para criar seu perfil no sistema.</CardDescription>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="p-8">
                            <form onSubmit={handleSave} className="space-y-8">
                                
                                {/* 1. DADOS PESSOAIS */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b pb-2">
                                        <User className="size-5 text-primary" />
                                        <h3 className="font-black uppercase italic text-sm tracking-tight text-slate-800">1. Dados Pessoais</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="name">Nome Completo *</Label>
                                            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="phone">WhatsApp (com DDD) *</Label>
                                            <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="(99) 99999-9999" required />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="cpf">CPF</Label>
                                            <Input id="cpf" name="cpf" value={formData.cpf} onChange={handleInputChange} placeholder="000.000.000-00" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="sexo">Sexo</Label>
                                            <Select value={formData.sexo} onValueChange={(v) => handleSelectChange('sexo', v)}>
                                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Masculino">Masculino</SelectItem>
                                                    <SelectItem value="Feminino">Feminino</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                                            <Input id="dataNascimento" name="dataNascimento" type="date" value={formData.dataNascimento} onChange={handleInputChange} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="estadoCivil">Estado Civil</Label>
                                            <Select value={formData.estadoCivil} onValueChange={(v) => handleSelectChange('estadoCivil', v)}>
                                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                                                    <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                                                    <SelectItem value="União Estável">União Estável</SelectItem>
                                                    <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                                                    <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. FAMÍLIA */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b pb-2">
                                        <Heart className="size-5 text-primary" />
                                        <h3 className="font-black uppercase italic text-sm tracking-tight text-slate-800">2. Família</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {showConjuge && (
                                            <div className="space-y-1.5 col-span-1 md:col-span-2 animate-in fade-in duration-200">
                                                <Label htmlFor="conjuge">Nome do Cônjuge</Label>
                                                <Input id="conjuge" name="conjuge" value={formData.conjuge} onChange={handleInputChange} placeholder="Nome completo do cônjuge" />
                                            </div>
                                        )}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="temFilhos">Possui Filhos?</Label>
                                            <Select value={formData.temFilhos} onValueChange={(v) => handleSelectChange('temFilhos', v)}>
                                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="sim">Sim</SelectItem>
                                                    <SelectItem value="nao">Não</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {formData.temFilhos === 'sim' && (
                                            <div className="space-y-1.5 animate-in fade-in duration-200">
                                                <Label htmlFor="idadeFilhos">Idade dos Filhos (separe por vírgula)</Label>
                                                <Input id="idadeFilhos" name="idadeFilhos" value={formData.idadeFilhos} onChange={handleInputChange} placeholder="Ex: 5, 8, 12" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 3. ENDEREÇO E PROFISSÃO */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b pb-2">
                                        <Home className="size-5 text-primary" />
                                        <h3 className="font-black uppercase italic text-sm tracking-tight text-slate-800">3. Endereço e Profissão</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5 col-span-1 md:col-span-2">
                                            <Label htmlFor="addressStreet">Endereço Completo (Sincronizado com Google Maps)</Label>
                                            <GooglePlacesAutocomplete
                                                defaultValue={formData.addressStreet}
                                                onAddressSelect={handleAddressSelect}
                                                placeholder="Rua, Nº, Bairro, Cidade - UF"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="addressCep">CEP</Label>
                                            <Input id="addressCep" name="addressCep" value={formData.addressCep} onChange={handleInputChange} placeholder="00000-000" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="escolaridade">Escolaridade</Label>
                                            <Select value={formData.escolaridade} onValueChange={(v) => handleSelectChange('escolaridade', v)}>
                                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Fundamental Incompleto">Fundamental Incompleto</SelectItem>
                                                    <SelectItem value="Fundamental Completo">Fundamental Completo</SelectItem>
                                                    <SelectItem value="Médio Incompleto">Médio Incompleto</SelectItem>
                                                    <SelectItem value="Médio Completo">Médio Completo</SelectItem>
                                                    <SelectItem value="Superior Incompleto">Superior Incompleto</SelectItem>
                                                    <SelectItem value="Superior Completo">Superior Completo</SelectItem>
                                                    <SelectItem value="Pós-Graduação">Pós-Graduação</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="profissao">Profissão</Label>
                                            <Input id="profissao" name="profissao" value={formData.profissao} onChange={handleInputChange} placeholder="Ex: Professor, Autônomo..." />
                                        </div>
                                    </div>
                                </div>

                                {/* 4. JORNADA ESPIRITUAL */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b pb-2">
                                        <Compass className="size-5 text-primary" />
                                        <h3 className="font-black uppercase italic text-sm tracking-tight text-slate-800">4. Jornada e Conexão</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="comoConheceu">Como conheceu a igreja?</Label>
                                            <Input id="comoConheceu" name="comoConheceu" value={formData.comoConheceu} onChange={handleInputChange} placeholder="Ex: Redes sociais, Um amigo..." />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="nomeConvidou">Quem te convidou?</Label>
                                            <Input id="nomeConvidou" name="nomeConvidou" value={formData.nomeConvidou} onChange={handleInputChange} placeholder="Nome de quem te convidou, se houver" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="batizado">É Batizado nas Águas?</Label>
                                            <Select value={formData.batizado} onValueChange={(v) => handleSelectChange('batizado', v)}>
                                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="sim">Sim</SelectItem>
                                                    <SelectItem value="nao">Não</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {formData.batizado === 'sim' && (
                                            <>
                                                <div className="space-y-1.5 animate-in fade-in duration-200">
                                                    <Label htmlFor="dataBatismo">Data de Batismo</Label>
                                                    <Input id="dataBatismo" name="dataBatismo" type="date" value={formData.dataBatismo} onChange={handleInputChange} />
                                                </div>
                                                <div className="space-y-1.5 animate-in fade-in duration-200">
                                                    <Label htmlFor="igrejaBatismo">Onde / Em qual igreja se batizou?</Label>
                                                    <Input id="igrejaBatismo" name="igrejaBatismo" value={formData.igrejaBatismo} onChange={handleInputChange} placeholder="Nome da igreja ou local" />
                                                </div>
                                            </>
                                        )}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="membroAntigo">Já foi membro de outra igreja?</Label>
                                            <Select value={formData.membroAntigo} onValueChange={(v) => handleSelectChange('membroAntigo', v)}>
                                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="sim">Sim</SelectItem>
                                                    <SelectItem value="nao">Não</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {formData.membroAntigo === 'sim' && (
                                            <div className="space-y-1.5 animate-in fade-in duration-200">
                                                <Label htmlFor="igrejaAntiga">Qual igreja anterior?</Label>
                                                <Input id="igrejaAntiga" name="igrejaAntiga" value={formData.igrejaAntiga} onChange={handleInputChange} placeholder="Nome da igreja anterior" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 5. VEÍCULO */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b pb-2">
                                        <Car className="size-5 text-primary" />
                                        <h3 className="font-black uppercase italic text-sm tracking-tight text-slate-800">5. Dados do Veículo</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="veiculoPlaca">Placa do Veículo</Label>
                                            <Input id="veiculoPlaca" name="veiculoPlaca" value={formData.veiculoPlaca} onChange={handleInputChange} placeholder="ABC1D23" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="veiculoMarca">Marca</Label>
                                            <Input id="veiculoMarca" name="veiculoMarca" value={formData.veiculoMarca} onChange={handleInputChange} placeholder="Toyota, Chevrolet..." />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="veiculoModelo">Modelo</Label>
                                            <Input id="veiculoModelo" name="veiculoModelo" value={formData.veiculoModelo} onChange={handleInputChange} placeholder="Corolla, Onix..." />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="veiculoCor">Cor</Label>
                                            <Input id="veiculoCor" name="veiculoCor" value={formData.veiculoCor} onChange={handleInputChange} placeholder="Preto, Prata, Branco..." />
                                        </div>
                                    </div>
                                </div>

                                {/* 6. CÉLULA (GC) E VOLUNTARIADO */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b pb-2">
                                        <HandHelping className="size-5 text-primary" />
                                        <h3 className="font-black uppercase italic text-sm tracking-tight text-slate-800">6. Célula (GC) e Voluntariado</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="celulaId">Sua Célula / GC</Label>
                                            <Select value={formData.celulaId || 'null'} onValueChange={(v) => handleSelectChange('celulaId', v)}>
                                                <SelectTrigger id="celulaId"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="null">Nenhuma / Não participo</SelectItem>
                                                    {cells.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="serviceAreaId">Tem interesse em servir em alguma área voluntária?</Label>
                                            <Select value={formData.serviceAreaId || 'null'} onValueChange={(v) => handleSelectChange('serviceAreaId', v)}>
                                                <SelectTrigger id="serviceAreaId"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="null">Apenas frequentar / Sem área por enquanto</SelectItem>
                                                    {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t justify-end">
                                    <Button type="button" variant="outline" onClick={() => setStep('email')} disabled={isSaving}>
                                        Voltar
                                    </Button>
                                    <Button type="submit" disabled={isSaving}>
                                        {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                                        {userId ? 'Salvar Alterações' : 'Concluir Cadastro'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </main>
    );
}
