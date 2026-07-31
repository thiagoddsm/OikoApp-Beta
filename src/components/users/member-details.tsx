
'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Phone, Home, CheckCircle, Calendar, Users, MapPin, BadgeHelp, UserPlus, Smartphone, Clock, Mail, Church, Target, LogIn, GraduationCap, Briefcase, IdCard, Car } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { getCaminhadaInicioLabel, getProximoPassoLabel } from './journey-status-config';

interface DetailItemProps {
  icon: React.ComponentType<any>;
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

interface MemberDetailsProps {
  user: any;
}

export function MemberDetails({ user }: MemberDetailsProps) {
  const formatBaptismVal = () => {
    if (user.batizado !== 'sim') return 'Não';
    const place = user.igrejaBatismo ? ` na ${user.igrejaBatismo}` : '';
    if (user.dataBatismo) {
      try {
        const formattedDate = format(parseISO(user.dataBatismo), 'dd/MM/yyyy', { locale: ptBR });
        return `Sim (em ${formattedDate})${place}`;
      } catch (e) {
        return `Sim (em ${user.dataBatismo})${place}`;
      }
    }
    return `Sim${place}`;
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Dados do Perfil</CardTitle>
            <CardDescription>Informações de contato, jornada espiritual e chegada na igreja.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            <section>
                <h4 className="font-semibold text-primary border-b pb-2 mb-4">Dados Pessoais</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem icon={User} label="Nome" value={user.name} />
                    <DetailItem icon={IdCard} label="CPF" value={user.cpf || 'Não informado'} />
                    <DetailItem icon={Users} label="Sexo" value={user.sexo || user.gender || 'Não informado'} />
                    <DetailItem icon={Mail} label="Email" value={user.email || 'Não informado'} />
                    <DetailItem icon={Phone} label="Telefone" value={user.phone || 'Não informado'} />
                    <DetailItem icon={Calendar} label="Nascimento" value={user.dataNascimento || 'Não informado'} />
                    <DetailItem icon={GraduationCap} label="Escolaridade" value={user.escolaridade || user.professional?.educationLevel || 'Não informado'} />
                    <DetailItem icon={Briefcase} label="Profissão" value={user.profissao || user.professional?.profession || 'Não informado'} />
                    <DetailItem icon={Users} label="Estado Civil" value={user.estadoCivil || 'Não informado'} />
                    <DetailItem icon={MapPin} label="CEP" value={user.address?.cep || 'Não informado'} />
                    <DetailItem icon={Home} label="Endereço" value={user.address?.street || 'Não informado'} />
                </div>
            </section>
            <section>
                <h4 className="font-semibold text-primary border-b pb-2 mb-4">Jornada Espiritual e Conexão</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem icon={LogIn} label="Início da Caminhada" value={getCaminhadaInicioLabel(user.caminhadaInicio, user.initialStatus)} />
                    <DetailItem icon={Calendar} label="Data da Decisão / Conversão" value={user.dataDecisao || null} />
                    <DetailItem icon={CheckCircle} label="Batizado nas Águas?" value={formatBaptismVal()} />
                    {(user.caminhadaInicio === 'transferencia' || user.membroAntigo === 'sim') && (
                        <DetailItem icon={Church} label="Igreja de Origem" value={user.igrejaAntiga ? `Vim da ${user.igrejaAntiga}` : 'Sim (Vim de outra igreja)'} />
                    )}
                    {user.statusArrolamento && (
                        <DetailItem icon={Church} label="Status de Arrolamento" value={user.statusArrolamento} />
                    )}
                    <DetailItem 
                        icon={Target} 
                        label="Desejos de Conexão / Próximos Passos" 
                        value={
                            Array.isArray(user.proximosPassos) && user.proximosPassos.length > 0
                                ? user.proximosPassos.map(getProximoPassoLabel)
                                : (Array.isArray(user.decisao) && user.decisao.length > 0 ? user.decisao.map(getProximoPassoLabel) : null)
                        } 
                    />
                </div>
            </section>
            <section>
                <h4 className="font-semibold text-primary border-b pb-2 mb-4">Chegada na IBM</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem icon={BadgeHelp} label="Como conheceu a IBM" value={user.comoConheceu || 'Não informado'} />
                    <DetailItem icon={UserPlus} label="Quem convidou" value={user.nomeConvidou || 'Não informado'} />
                    <DetailItem icon={Smartphone} label="Preferência de Contato" value={user.contatoPreferencia?.join(', ') || 'Não informado'} />
                    <DetailItem icon={Clock} label="Turno para Contato" value={user.contatoTurno?.join(', ') || 'Não informado'} />
                </div>
            </section>
            {/* Dados do Veículo */}
            {(user.veiculo?.placa || user.veiculo?.marca || user.veiculo?.modelo || user.veiculo?.cor || user.veiculoPlaca || user.veiculoMarca || user.veiculoModelo || user.veiculoCor) && (
                <section>
                    <h4 className="font-semibold text-primary border-b pb-2 mb-4">Dados do Veículo</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        <DetailItem icon={Car} label="Placa do Veículo" value={user.veiculo?.placa || user.veiculoPlaca} />
                        <DetailItem icon={Car} label="Marca" value={user.veiculo?.marca || user.veiculoMarca} />
                        <DetailItem icon={Car} label="Modelo" value={user.veiculo?.modelo || user.veiculoModelo} />
                        <DetailItem icon={Car} label="Cor" value={user.veiculo?.cor || user.veiculoCor} />
                    </div>
                </section>
            )}
        </CardContent>
    </Card>
  );
}
