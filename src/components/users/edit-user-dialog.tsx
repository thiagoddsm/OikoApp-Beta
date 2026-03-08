'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, doc, Timestamp } from 'firebase/firestore';
import { userRoles } from '@/lib/roles';
import { journeyColumns } from '@/components/users/journey-status-config';
import { Textarea } from '../ui/textarea';

type User = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  integrationStatus?: string;
  cpf?: string;
  sexo?: string;
  escolaridade?: string;
  profissao?: string;
  dataNascimento?: string;
  estadoCivil?: string;
  address?: {
    street?: string;
    cep?: string;
  };
  hierarchy?: {
    role?: string;
    celulaId?: string;
    supervisorId?: string;
  }
  batizado?: string;
  igrejaBatismo?: string;
  membroAntigo?: string;
  igrejaAntiga?: string;
  decisao?: string[];
  initialStatus?: string;
  dataDecisao?: string;
  temFilhos?: string;
  idadeFilhos?: string;
  comoConheceu?: string;
  nomeConvidou?: string;
  contatoPreferencia?: string[];
  contatoTurno?: string[];
  observacoes?: string;
};

type Cell = {
  id: string;
  nome: string;
};

const escolaridadeOptions = [
    "Analfabeto", 
    "Fundamental Incompleto", 
    "Fundamental Completo", 
    "Médio Incompleto", 
    "Médio Completo", 
    "Superior Incompleto", 
    "Superior Completo", 
    "Pós-Graduação"
];

interface EditUserDialogProps {
    user: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const { toast } = useToast();
  const { firestore, user: currentUser } = useFirebase();
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!user;
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    dataNascimento: '',
    email: '',
    cpf: '',
    sexo: '',
    escolaridade: '',
    profissao: '',
    addressStreet: '',
    addressCep: '',
    batizado: 'nao',
    igrejaBatismo: '',
    membroAntigo: 'nao',
    igrejaAntiga: '',
    decisao: [] as string[],
    initialStatus: '',
    dataDecisao: '',
    estadoCivil: '',
    temFilhos: 'nao',
    idadeFilhos: '',
    comoConheceu: '',
    nomeConvidou: '',
    contatoPreferencia: [] as string[],
    contatoTurno: [] as string[],
    observacoes: '',
    integrationStatus: '',
    role: '',
    celulaId: '',
    supervisorId: '',
  });
  
  const cellsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'cells')) : null, [firestore]);
  const { data: cells, isLoading: isLoadingCells } = useCollection<Cell>(cellsQuery);

  const allUsersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<User>(allUsersQuery);

  const supervisors = useMemo(() => {
    if (!allUsers) return [];
    const leaderRoles = ['lider_gc', 'lider_area', 'lider_rede', 'pastor', 'pastor_senior', 'admin'];
    return allUsers.filter(u => u.hierarchy?.role && leaderRoles.includes(u.hierarchy.role));
  }, [allUsers]);


  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        cpf: user.cpf || '',
        sexo: user.sexo || '',
        escolaridade: user.escolaridade || '',
        profissao: user.profissao || '',
        dataNascimento: user.dataNascimento || '',
        estadoCivil: user.estadoCivil || '',
        addressStreet: user.address?.street || '',
        addressCep: user.address?.cep || '',
        integrationStatus: user.integrationStatus || 'nao_alcancado',
        role: user.hierarchy?.role || '',
        celulaId: user.hierarchy?.celulaId || '',
        supervisorId: user.hierarchy?.supervisorId || '',
        batizado: user.batizado || 'nao',
        igrejaBatismo: user.igrejaBatismo || '',
        membroAntigo: user.membroAntigo || 'nao',
        igrejaAntiga: user.igrejaAntiga || '',
        decisao: user.decisao || [],
        initialStatus: user.initialStatus || '',
        dataDecisao: user.dataDecisao || '',
        temFilhos: user.temFilhos || 'nao',
        idadeFilhos: user.idadeFilhos || '',
        comoConheceu: user.comoConheceu || '',
        nomeConvidou: user.nomeConvidou || '',
        contatoPreferencia: user.contatoPreferencia || [],
        contatoTurno: user.contatoTurno || [],
        observacoes: user.observacoes || '',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        dataNascimento: '',
        email: '',
        cpf: '',
        sexo: '',
        escolaridade: '',
        profissao: '',
        addressStreet: '',
        addressCep: '',
        batizado: 'nao',
        igrejaBatismo: '',
        membroAntigo: 'nao',
        igrejaAntiga: '',
        decisao: [],
        initialStatus: '',
        dataDecisao: '',
        estadoCivil: '',
        temFilhos: 'nao',
        idadeFilhos: '',
        comoConheceu: '',
        nomeConvidou: '',
        contatoPreferencia: [],
        contatoTurno: [],
        observacoes: '',
        integrationStatus: 'nao_alcancado',
        role: '',
        celulaId: '',
        supervisorId: '',
      });
    }
  }, [user, open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleRadioChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value === 'null' ? '' : value }));
  };

  const handleCheckboxChange = (name: 'decisao' | 'contatoPreferencia' | 'contatoTurno', value: string, checked: boolean) => {
    setFormData(prev => {
        const currentValues = (prev[name] as string[]) || [];
        if (checked) {
            return { ...prev, [name]: [...currentValues, value] };
        } else {
            return { ...prev, [name]: currentValues.filter(v => v !== value) };
        }
    });
  };

  const handleSave = async () => {
    if (!firestore) {
        toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'Serviço de banco de dados não disponível.',
        });
        return;
    }
    if (!formData.name) {
         toast({
            variant: 'destructive',
            title: 'Campo Obrigatório',
            description: 'O nome é obrigatório.',
        });
        return;
    }
    setIsSaving(true);

    let finalIntegrationStatus = formData.integrationStatus;
    if (finalIntegrationStatus === 'nao_alcancado') {
        if (formData.decisao.includes('Decisão por Cristo')) {
            finalIntegrationStatus = 'novo_convertido';
        } else if (formData.decisao.includes('Reconciliação')) {
            finalIntegrationStatus = 'reconciliado';
        } else if (formData.initialStatus === 'membro_outra_igreja') {
            finalIntegrationStatus = 'transferido';
        }
    }
    
    const dataToSave = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        cpf: formData.cpf,
        sexo: formData.sexo,
        escolaridade: formData.escolaridade,
        profissao: formData.profissao,
        dataNascimento: formData.dataNascimento,
        estadoCivil: formData.estadoCivil,
        address: {
            street: formData.addressStreet,
            cep: formData.addressCep,
        },
        integrationStatus: finalIntegrationStatus,
        hierarchy: {
            celulaId: formData.celulaId || null,
            supervisorId: formData.supervisorId || null,
            role: formData.role || (isEditing ? user.hierarchy?.role : '') || ''
        },
        batizado: formData.batizado,
        igrejaBatismo: formData.igrejaBatismo,
        membroAntigo: formData.membroAntigo,
        igrejaAntiga: formData.igrejaAntiga,
        decisao: formData.decisao,
        initialStatus: formData.initialStatus,
        dataDecisao: formData.dataDecisao,
        temFilhos: formData.temFilhos,
        idadeFilhos: formData.idadeFilhos,
        comoConheceu: formData.comoConheceu,
        nomeConvidou: formData.nomeConvidou,
        contatoPreferencia: formData.contatoPreferencia,
        contatoTurno: formData.contatoTurno,
        observacoes: formData.observacoes,
    };

    try {
        if(isEditing && user) {
            const userDocRef = doc(firestore, 'users', user.id);
            updateDocumentNonBlocking(userDocRef, dataToSave);
            toast({
                title: 'Sucesso!',
                description: 'O perfil do usuário será atualizado em breve.',
            });
        } else {
            const usersCollection = collection(firestore, 'users');
            addDocumentNonBlocking(usersCollection, {
                ...dataToSave,
                createdAt: Timestamp.now()
            });
             toast({
                title: 'Sucesso!',
                description: 'A nova pessoa foi adicionada à jornada.',
            });
        }
        
        onOpenChange(false);
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Erro ao Salvar',
            description: 'Não foi possível iniciar a atualização. Verifique suas permissões.',
        });
    } finally {
        setIsSaving(false);
    }
  };
  
  const contatoPreferenciaOptions = ["Ligação", "WhatsApp"];
  const contatoTurnoOptions = ["Manhã", "Tarde", "Noite"];
  const decisaoOptions = ["Decisão por Cristo", "Reconciliação", "Ingressar em um GC", "Apenas Visitando", "Procurando uma igreja para congregar"];
  const isSelf = currentUser && user && currentUser.uid === user.id;
  const isOnlyAdmin = useMemo(() => {
    if (!isSelf || !allUsers) return false;
    const adminCount = allUsers.filter(u => u.hierarchy?.role === 'admin' || u.hierarchy?.role === 'pastor_senior').length;
    return adminCount === 1;
  }, [allUsers, isSelf]);


  return (
    <>
      <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
        <section className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-semibold text-primary border-b pb-2">Dados Pessoais</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="phone">Celular (com DDD) *</Label>
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
                            <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                    <Input id="dataNascimento" name="dataNascimento" type="date" value={formData.dataNascimento} onChange={handleInputChange} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="escolaridade">Escolaridade</Label>
                    <Select value={formData.escolaridade} onValueChange={(v) => handleSelectChange('escolaridade', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                            {escolaridadeOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="profissao">Profissão</Label>
                    <Input id="profissao" name="profissao" value={formData.profissao} onChange={handleInputChange} placeholder="Ex: Advogado, Vendedor..." />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="addressCep">CEP</Label>
                    <Input id="addressCep" name="addressCep" value={formData.addressCep} onChange={handleInputChange} placeholder="00000-000" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="addressStreet">Endereço (Rua e Nº)</Label>
                    <Input id="addressStreet" name="addressStreet" value={formData.addressStreet} onChange={handleInputChange} placeholder="Rua das Flores, 123" />
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
                 <div className="space-y-1.5">
                    <Label>Possui filho(s)?</Label>
                     <RadioGroup value={formData.temFilhos} onValueChange={(v) => handleRadioChange('temFilhos', v)} className="flex items-center gap-4"><RadioGroupItem value="sim" id="filhos-sim" /><Label htmlFor="filhos-sim">Sim</Label><RadioGroupItem value="nao" id="filhos-nao" /><Label htmlFor="filhos-nao">Não</Label></RadioGroup>
                </div>
                {formData.temFilhos === 'sim' && <div className="md:col-span-2 space-y-1.5"><Label htmlFor="idadeFilhos">Qual a idade do(s) seu(s) filho(s)?</Label><Input id="idadeFilhos" name="idadeFilhos" value={formData.idadeFilhos} onChange={handleInputChange} placeholder="Ex: 5, 10, 15" /></div>}
            </div>
        </section>
        
        <section className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-semibold text-primary border-b pb-2">Jornada Espiritual</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <Label>Batizado?</Label>
                    <RadioGroup value={formData.batizado} onValueChange={(v) => handleRadioChange('batizado', v)} className="flex items-center gap-4"><RadioGroupItem value="sim" id="batizado-sim" /><Label htmlFor="batizado-sim">Sim</Label><RadioGroupItem value="nao" id="batizado-nao" /><Label htmlFor="batizado-nao">Não</Label></RadioGroup>
                </div>
                {formData.batizado === 'sim' && <div className="space-y-1.5"><Label htmlFor="igrejaBatismo">Qual igreja foi batizado?</Label><Input id="igrejaBatismo" name="igrejaBatismo" value={formData.igrejaBatismo} onChange={handleInputChange}/></div>}

                 <div className="space-y-1.5">
                    <Label>Veio de outra igreja?</Label>
                    <RadioGroup value={formData.membroAntigo} onValueChange={(v) => handleRadioChange('membroAntigo', v)} className="flex items-center gap-4"><RadioGroupItem value="sim" id="membro-sim" /><Label htmlFor="membro-sim">Sim</Label><RadioGroupItem value="nao" id="membro-nao" /><Label htmlFor="membro-nao">Não</Label></RadioGroup>
                </div>
                {formData.membroAntigo === 'sim' && <div className="space-y-1.5"><Label htmlFor="igrejaAntiga">Qual o nome da igreja de origem?</Label><Input id="igrejaAntiga" name="igrejaAntiga" value={formData.igrejaAntiga} onChange={handleInputChange}/></div>}
                
                <div className="space-y-1.5">
                    <Label htmlFor="initialStatus">Status Inicial *</Label>
                    <Select value={formData.initialStatus} onValueChange={(v) => handleSelectChange('initialStatus', v)}>
                        <SelectTrigger id="initialStatus"><SelectValue placeholder="Selecione o status..."/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="nao_convertido">Não Convertido</SelectItem>
                            <SelectItem value="novo_convertido">Novo Convertido</SelectItem>
                            <SelectItem value="reconciliado">Reconciliado</SelectItem>
                            <SelectItem value="membro_outra_igreja">Membro de outra igreja</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                 <div className="space-y-1.5">
                    <Label>Decisões Tomadas</Label>
                     <div className="flex flex-col space-y-2">
                        {decisaoOptions.map(item => (<div key={item} className="flex items-center gap-2"><Checkbox id={`decisao-${item}`} checked={formData.decisao.includes(item)} onCheckedChange={(checked) => handleCheckboxChange('decisao', item, !!checked)}/><Label htmlFor={`decisao-${item}`}>{item}</Label></div>))}
                    </div>
                </div>

                 <div className="space-y-1.5">
                    <Label htmlFor="dataDecisao">Data da decisão</Label>
                    <Input id="dataDecisao" name="dataDecisao" type="date" value={formData.dataDecisao} onChange={handleInputChange} />
                </div>
            </div>
        </section>

         <section className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-semibold text-primary border-b pb-2">Chegada na IBM</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <Label htmlFor="comoConheceu">Como conheceu a IBM?</Label>
                    <Select value={formData.comoConheceu} onValueChange={(v) => handleSelectChange('comoConheceu', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent><SelectItem value="Convite">Convite</SelectItem><SelectItem value="Fachada">Fachada</SelectItem><SelectItem value="Redes Sociais">Redes Sociais</SelectItem><SelectItem value="GC">GC</SelectItem></SelectContent>
                    </Select>
                </div>
                 {formData.comoConheceu === 'Convite' && <div className="space-y-1.5"><Label htmlFor="nomeConvidou">Qual nome da pessoa que te convidou?</Label><Input id="nomeConvidou" name="nomeConvidou" value={formData.nomeConvidou} onChange={handleInputChange}/></div>}
                
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Forma de Contato Preferida</Label>
                        <div className="flex items-center gap-4">
                        {contatoPreferenciaOptions.map(item => (<div key={item} className="flex items-center gap-2"><Checkbox id={`pref-${item}`} checked={formData.contatoPreferencia.includes(item)} onCheckedChange={(checked) => handleCheckboxChange('contatoPreferencia', item, !!checked)}/><Label htmlFor={`pref-${item}`}>{item}</Label></div>))}
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Turno Preferido</Label>
                         <div className="flex items-center gap-4">
                        {contatoTurnoOptions.map(item => (<div key={item} className="flex items-center gap-2"><Checkbox id={`turno-${item}`} checked={formData.contatoTurno.includes(item)} onCheckedChange={(checked) => handleCheckboxChange('contatoTurno', item, !!checked)}/><Label htmlFor={`turno-${item}`}>{item}</Label></div>))}
                         </div>
                    </div>
                </div>
            </div>
         </section>

         <section className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-semibold text-primary border-b pb-2">Estrutura e Jornada</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <Label htmlFor="integrationStatus">Etapa da Jornada</Label>
                    <Select value={formData.integrationStatus} onValueChange={(v) => handleSelectChange('integrationStatus', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione a etapa..." /></SelectTrigger>
                        <SelectContent>
                            {journeyColumns.map(col => <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="role">Perfil de Acesso</Label>
                    <Select value={formData.role} onValueChange={(v) => handleSelectChange('role', v)} disabled={isOnlyAdmin}>
                        <SelectTrigger><SelectValue placeholder="Selecione o perfil..." /></SelectTrigger>
                        <SelectContent>
                            {Object.entries(userRoles).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {isOnlyAdmin && <p className="text-xs text-destructive">Você é o único admin e não pode alterar seu próprio perfil.</p>}
                </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="celulaId">Célula (GC)</Label>
                    <Select value={formData.celulaId} onValueChange={(v) => handleSelectChange('celulaId', v)} disabled={isLoadingCells}>
                        <SelectTrigger><SelectValue placeholder={isLoadingCells ? "Carregando..." : "Selecione a célula..."} /></SelectTrigger>
                        <SelectContent>
                             <SelectItem value="null">Nenhuma</SelectItem>
                            {cells?.map(cell => <SelectItem key={cell.id} value={cell.id}>{cell.nome}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="supervisorId">Responsável pelo Acompanhamento</Label>
                     <Select value={formData.supervisorId} onValueChange={(v) => handleSelectChange('supervisorId', v)} disabled={isLoadingUsers}>
                        <SelectTrigger><SelectValue placeholder={isLoadingUsers ? "Carregando..." : "Selecione o responsável..."} /></SelectTrigger>
                        <SelectContent>
                             <SelectItem value="null">Nenhum</SelectItem>
                            {supervisors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
             </div>
        </section>

         <section className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-semibold text-primary border-b pb-2">Observações</h4>
            <div className="space-y-1.5">
                <Label htmlFor="observacoes">Observações Gerais</Label>
                <Textarea id="observacoes" name="observacoes" value={formData.observacoes} onChange={handleInputChange} placeholder="Alergias, necessidades especiais, ou qualquer outra informação relevante." />
            </div>
         </section>
        
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </>
  );
}
