
'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Phone, Home, CheckCircle, Calendar, Users, MapPin, BadgeHelp, UserPlus, Smartphone, Clock, Mail, Church, Target, LogIn, GraduationCap, Briefcase, IdCard } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DetailItemProps {
  icon: any;
  label: string;
  value: any;
}

const DetailItem = ({ icon, label, value }: DetailItemProps) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    const Icon = icon;
    
    let displayValue: React.ReactNode = value;
    if (Array.isArray(value)) {
        displayValue = value.join(', ');
    } else if (label.toLowerCase().includes('data')) {
        try {
            displayValue = format(parseISO(value), 'dd/MM/yyyy', { locale: ptBR });
        } catch (e) {
            try {
                 const [year, month, day] = value.split('-').map(Number);
                 const date = new Date(year, month - 1, day);
                 displayValue = format(date, 'dd/MM/yyyy', { locale: ptBR });
            } catch (e2) {
                // Keep original
            }
        }
    }

    return (
        <div className="flex items-start gap-3">
            <Icon className="size-4 text-muted-foreground mt-1 shrink-0" />
            <div>
                <span className="text-xs text-muted-foreground">{label}</span>
                <p className="text-sm font-medium">{displayValue}</p>
            </div>
        </div>
    );
};

export function MemberDetails({ user }: { user: any }) {
  return (
    <Card>
        <CardHeader>
            <CardTitle>Dados do Perfil</CardTitle>
            <CardDescription>Informações de contato, jornada espiritual e chegada na igreja.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            <section>
                <h4 className="font-semibold text-primary border-b pb-2 mb-4">Dados Pessoais</h4>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem icon={User} label="Nome" value={user.name} />
                    <DetailItem icon={IdCard} label="CPF" value={user.cpf || 'Não informado'} />
                    <DetailItem icon={Users} label="Sexo" value={user.sexo || 'Não informado'} />
                    <DetailItem icon={Mail} label="Email" value={user.email || 'Não informado'} />
                    <DetailItem icon={Phone} label="Telefone" value={user.phone || 'Não informado'} />
                    <DetailItem icon={Calendar} label="Nascimento" value={user.dataNascimento || 'Não informado'} />
                    <DetailItem icon={GraduationCap} label="Escolaridade" value={user.escolaridade || 'Não informado'} />
                    <DetailItem icon={Briefcase} label="Profissão" value={user.profissao || 'Não informado'} />
                    <DetailItem icon={Users} label="Estado Civil" value={user.estadoCivil || 'Não informado'} />
                    <DetailItem icon={MapPin} label="CEP" value={user.address?.cep || 'Não informado'} />
                    <DetailItem icon={Home} label="Endereço" value={user.address?.street || 'Não informado'} />
                    <DetailItem icon={Users} label="Filhos" value={`${user.temFilhos === 'sim' ? 'Sim' : 'Não'} ${user.idadeFilhos ? `(${user.idadeFilhos})` : ''}`} />
                </div>
            </section>
            <section>
                <h4 className="font-semibold text-primary border-b pb-2 mb-4">Jornada Espiritual</h4>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem icon={CheckCircle} label="Batizado?" value={user.batizado === 'sim' ? `Sim, na ${user.igrejaBatismo || 'igreja'}` : 'Não'} />
                    <DetailItem icon={Church} label="Veio de outra igreja?" value={user.membroAntigo === 'sim' ? `Sim, da ${user.igrejaAntiga || 'outra igreja'}` : 'Não'} />
                    <DetailItem icon={LogIn} label="Status Inicial" value={user.initialStatus?.replace('_', ' ') || 'Não informado'} />
                    <DetailItem icon={Target} label="Decisão" value={user.decisao?.join(', ') || 'Não informado'} />
                    <DetailItem icon={Calendar} label="Data da Decisão" value={user.dataDecisao || 'Não informado'} />
                </div>
            </section>
            <section>
                <h4 className="font-semibold text-primary border-b pb-2 mb-4">Chegada na IBM</h4>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem icon={BadgeHelp} label="Como conheceu a IBM" value={user.comoConheceu || 'Não informado'} />
                    <DetailItem icon={UserPlus} label="Quem convidou" value={user.nomeConvidou || 'Não informado'} />
                    <DetailItem icon={Smartphone} label="Preferência de Contato" value={user.contatoPreferencia?.join(', ') || 'Não informado'} />
                    <DetailItem icon={Clock} label="Turno para Contato" value={user.contatoTurno?.join(', ') || 'Não informado'} />
                </div>
            </section>
        </CardContent>
    </Card>
  );
}
