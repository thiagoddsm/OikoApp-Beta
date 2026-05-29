import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertTriangle, RefreshCcw, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentStatusBadgeProps {
  status: string;
  className?: string;
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  const upper = status?.toUpperCase();

  if (upper === 'RECEIVED' || upper === 'CONFIRMED') {
    return (
      <Badge
        className={cn(
          'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none inline-flex items-center gap-1',
          className
        )}
      >
        <CheckCircle2 className="size-3" />
        Pago
      </Badge>
    );
  }

  if (upper === 'PENDING') {
    return (
      <Badge
        className={cn(
          'bg-amber-100 text-amber-800 hover:bg-amber-100 border-none inline-flex items-center gap-1',
          className
        )}
      >
        <Clock className="size-3" />
        Pendente
      </Badge>
    );
  }

  if (upper === 'OVERDUE') {
    return (
      <Badge
        className={cn(
          'bg-red-100 text-red-800 hover:bg-red-100 border-none inline-flex items-center gap-1',
          className
        )}
      >
        <AlertTriangle className="size-3" />
        Vencido
      </Badge>
    );
  }

  if (upper === 'REFUNDED') {
    return (
      <Badge
        className={cn(
          'bg-gray-100 text-gray-700 hover:bg-gray-100 border-none inline-flex items-center gap-1',
          className
        )}
      >
        <RefreshCcw className="size-3" />
        Reembolsado
      </Badge>
    );
  }

  if (upper === 'CANCELLED') {
    return (
      <Badge
        className={cn(
          'bg-slate-100 text-slate-600 hover:bg-slate-100 border-none inline-flex items-center gap-1',
          className
        )}
      >
        <XCircle className="size-3" />
        Cancelado
      </Badge>
    );
  }

  // Fallback: show raw status text
  return (
    <Badge
      className={cn(
        'bg-slate-100 text-slate-600 hover:bg-slate-100 border-none',
        className
      )}
    >
      {status}
    </Badge>
  );
}
