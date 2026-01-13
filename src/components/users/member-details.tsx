
'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, HeartHandshake, Phone, Home, CheckCircle, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DetailItem = ({ icon, label, value }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    const Icon = icon;
    
    let displayValue: React.ReactNode = value;
    if (Array.isArray(value)) {
        displayValue = value.join(', ');
    } else if (label.toLowerCase().includes('data')) {
        try {
            displayValue = format(parseISO(value), 'dd/MM/yyyy', { locale: ptBR });
        } catch (e) {
            // Keep original value if parsing fails
        }
    }

    return (
        <div className="flex items-start">
            <Icon className="h-5 w-5 text-muted-foreground mr-3 mt-1 shrink-0" />
            <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-sm text-muted-foreground">{displayValue}</p>
            </div>
        </div>
    );
};

export function MemberDetails({ user }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Jornada Espiritual e Contato</CardTitle>
          <CardDescription>Detalhes sobre a caminhada de fé e como chegar até a pessoa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DetailItem icon={User} label="Estado Civil" value={user.estadoCivil} />
          <DetailItem icon={HeartHandshake} label="Decisão Tomada" value={user.decisao} />
          <DetailItem icon={HeartHandshake} label="Data da Decisão" value={user.dataDecisao} />
          <DetailItem icon={Phone} label="Preferência de Contato" value={user.contatoPreferencia} />
          <DetailItem icon={Phone} label="Turno para Contato" value={user.contatoTurno} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Histórico e Origem</CardTitle>
          <CardDescription>Informações sobre a vida pregressa na igreja.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <DetailItem 
                icon={user.batizado === 'sim' ? CheckCircle : XCircle} 
                label="Batizado?" 
                value={user.batizado === 'sim' ? `Sim, na ${user.igrejaBatismo || 'igreja informada'}` : 'Não'} 
            />
             <DetailItem 
                icon={user.membroAntigo === 'sim' ? CheckCircle : XCircle} 
                label="Foi membro de outra igreja?" 
                value={user.membroAntigo === 'sim' ? `Sim, da ${user.igrejaAntiga || 'igreja informada'}` : 'Não'} 
            />
             <DetailItem icon={Home} label="Como conheceu a IBM?" value={user.comoConheceu} />
             {user.comoConheceu === 'Convite' && <DetailItem icon={User} label="Convidado por" value={user.nomeConvidou} />}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Informações Adicionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
             <DetailItem 
                icon={user.temFilhos === 'sim' ? CheckCircle : XCircle} 
                label="Possui Filhos?" 
                value={user.temFilhos === 'sim' ? `Sim, com idade(s): ${user.idadeFilhos || 'não informado'}` : 'Não'} 
            />
        </CardContent>
      </Card>
    </div>
  );
}

