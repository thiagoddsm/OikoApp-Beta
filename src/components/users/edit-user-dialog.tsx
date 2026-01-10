'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, doc, Timestamp } from 'firebase/firestore';

const journeyColumns = [
    { id: 'visitante_nao_crente', title: 'Visitante (Não Crente)' },
    { id: 'novo_convertido', title: 'Novo Convertido' },
    { id: 'recem_chegado', title: 'Recém Chegado (de outra igreja)' },
    { id: 'em_discipulado_td', title: 'Em Discipulado (TD)' },
    { id: 'batizado_transferido', title: 'Batizado/Transferido' },
    { id: 'em_gc', title: 'Participando de GC' },
    { id: 'curso_membros', title: 'Fazendo Curso de Membros' },
    { id: 'servindo', title: 'Servindo em Ministério' },
    { id: 'lider_gc', title: 'Líder de GC' }
];

type User = {
  id: string;
  name: string;
  roles?: string[];
};

type Cell = {
  id: string;
  nome: string;
};

export function EditUserDialog({ user, open, onOpenChange }) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!user;
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dataNascimento: '',
    sexo: '',
    estadoCivil: '',
    addressStreet: '',
    integrationStatus: '',
    celulaId: '',
    supervisorId: '',
  });
  
  const cellsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'cells')) : null, [firestore]);
  const { data: cells, isLoading: isLoadingCells } = useCollection<Cell>(cellsQuery);

  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const supervisors = useMemo(() => {
    if (!allUsers) return [];
    const leaderRoles = ['gc_leader', 'lider_area', 'lider_rede', 'pastor', 'admin'];
    return allUsers.filter(u => u.roles?.some(role => leaderRoles.includes(role)));
  }, [allUsers]);


  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        dataNascimento: user.dataNascimento || '',
        sexo: user.sexo || '',
        estadoCivil: user.estadoCivil || '',
        addressStreet: user.address?.street || '',
        integrationStatus: user.integrationStatus || 'visitante_nao_crente',
        celulaId: user.hierarchy?.celulaId || '',
        supervisorId: user.hierarchy?.supervisorId || '',
      });
    } else {
       // Reset for new user
      setFormData({
        name: '',
        phone: '',
        email: '',
        dataNascimento: '',
        sexo: '',
        estadoCivil: '',
        addressStreet: '',
        integrationStatus: 'visitante_nao_crente',
        celulaId: '',
        supervisorId: '',
      });
    }
  }, [user, open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value === 'null' ? '' : value }));
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
    
    const dataToSave = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        dataNascimento: formData.dataNascimento,
        sexo: formData.sexo,
        estadoCivil: formData.estadoCivil,
        address: {
            street: formData.addressStreet,
        },
        integrationStatus: formData.integrationStatus,
        hierarchy: {
            celulaId: formData.celulaId || null,
            supervisorId: formData.supervisorId || null,
        }
    };

    try {
        if(isEditing) {
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
                roles: ['member'],
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

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Editar Perfil do Usuário' : 'Adicionar Nova Pessoa'}</DialogTitle>
        <DialogDescription>
          {isEditing ? 'Altere as informações abaixo e clique em salvar.' : 'Preencha os dados para adicionar uma nova pessoa à Jornada do Membro.'}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Nome
          </Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="col-span-3"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="phone" className="text-right">
            Telefone
          </Label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className="col-span-3"
          />
        </div>
         <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="email" className="text-right">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="dataNascimento" className="text-right">
            Nascimento
          </Label>
          <Input
            id="dataNascimento"
            name="dataNascimento"
            type="date"
            value={formData.dataNascimento}
            onChange={handleInputChange}
            className="col-span-3"
          />
        </div>
         <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="sexo" className="text-right">
            Sexo
          </Label>
          <Select value={formData.sexo} onValueChange={(v) => handleSelectChange('sexo', v)}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Selecione o sexo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Masculino">Masculino</SelectItem>
              <SelectItem value="Feminino">Feminino</SelectItem>
            </SelectContent>
          </Select>
        </div>
         <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="estadoCivil" className="text-right">
            Estado Civil
          </Label>
          <Select value={formData.estadoCivil} onValueChange={(v) => handleSelectChange('estadoCivil', v)}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Selecione o estado civil" />
            </SelectTrigger>
            <SelectContent>
               <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
               <SelectItem value="Casado(a)">Casado(a)</SelectItem>
               <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
               <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
            </SelectContent>
          </Select>
        </div>
         <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="addressStreet" className="text-right">
            Endereço
          </Label>
          <Input
            id="addressStreet"
            name="addressStreet"
            value={formData.addressStreet}
            onChange={handleInputChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="integrationStatus" className="text-right">
            Jornada
          </Label>
          <Select value={formData.integrationStatus} onValueChange={(v) => handleSelectChange('integrationStatus', v)}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Selecione o estágio" />
            </SelectTrigger>
            <SelectContent>
              {journeyColumns.map(status => (
                <SelectItem key={status.id} value={status.id}>
                  {status.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="celulaId" className="text-right">
            Célula
          </Label>
          <Select value={formData.celulaId} onValueChange={(v) => handleSelectChange('celulaId', v)}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder={isLoadingCells ? 'Carregando...' : 'Selecione a célula'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="null">Nenhuma</SelectItem>
              {cells?.map(cell => (
                <SelectItem key={cell.id} value={cell.id}>
                  {cell.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="supervisorId" className="text-right">
            Responsável
          </Label>
          <Select value={formData.supervisorId} onValueChange={(v) => handleSelectChange('supervisorId', v)}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder={isLoadingUsers ? 'Carregando...' : 'Selecione um responsável'} />
            </SelectTrigger>
            <SelectContent>
               <SelectItem value="null">Nenhum</SelectItem>
               {supervisors.map(sup => (
                <SelectItem key={sup.id} value={sup.id}>
                  {sup.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
