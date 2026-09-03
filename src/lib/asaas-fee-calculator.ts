/**
 * Utilitário de cálculo de taxas e repasse (gross-up) do Asaas.
 * Permite que a igreja defina um valor LÍQUIDO e o sistema calcule o valor BRUTO da cobrança.
 */

export type AsaasBillingMethod = 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD';

export interface FeeCalculationParams {
  netValue: number;               // Valor líquido desejado (ex: R$ 50,00)
  billingType: AsaasBillingMethod; // Método de cobrança
  installmentCount?: number;      // Número de parcelas (padrão: 1)
  passFees?: boolean;             // Se true, repassa as taxas para o pagador (gross-up)
  includeWhatsApp?: boolean;      // Se true, adiciona R$ 0,55 por parcela de notificação WhatsApp
  withAnticipation?: boolean;     // Se true, inclui a taxa de antecipação automática do Asaas
}

export interface FeeBreakdown {
  netValue: number;             // Valor líquido recebido pela igreja
  grossValue: number;           // Valor bruto final a ser cobrado
  totalFees: number;            // Total de taxas retidas pelo Asaas
  percentageRate: number;       // Percentual aplicado (em decimal, ex: 0.0299)
  fixedFee: number;             // Taxa fixa da transação (ex: 0.49 ou 1.99)
  whatsAppFee: number;          // Custo total de WhatsApp (0.55 * parcelas)
  anticipationRate: number;     // Taxa de antecipação (se aplicada)
  installmentCount: number;     // Número de parcelas
  installmentGrossValue: number;// Valor de cada parcela a cobrar
  installmentNetValue: number;  // Valor de cada parcela líquido
}

// Taxa por notificação WhatsApp (por parcela existente)
export const ASAAS_WHATSAPP_NOTIFICATION_FEE = 0.55;

/**
 * Obtém as taxas base do Asaas para o método e número de parcelas informados.
 */
export function getAsaasRates(
  billingType: AsaasBillingMethod,
  installmentCount = 1,
  withAnticipation = false
): { percentageRate: number; fixedFee: number; anticipationRate: number } {
  let percentageRate = 0;
  let fixedFee = 0;
  let anticipationRate = 0;

  switch (billingType) {
    case 'PIX':
      percentageRate = 0;
      fixedFee = 1.99; // R$ 1,99 por cobrança recebida
      break;

    case 'BOLETO':
      percentageRate = 0;
      fixedFee = 1.99; // R$ 1,99 por boleto pago
      break;

    case 'DEBIT_CARD':
      percentageRate = 0.0189; // 1,89%
      fixedFee = 0.35;         // + R$ 0,35
      break;

    case 'CREDIT_CARD':
      fixedFee = 0.49; // R$ 0,49 fixo por transação
      if (installmentCount <= 1) {
        percentageRate = 0.0299; // 2,99% à vista
        if (withAnticipation) {
          anticipationRate = 0.0115; // 1,15% a.m. com antecipação automática
        }
      } else if (installmentCount <= 6) {
        percentageRate = 0.0349; // 3,49% de 2 a 6 parcelas
        if (withAnticipation) {
          anticipationRate = 0.0160; // 1,60% a.m.
        }
      } else if (installmentCount <= 12) {
        percentageRate = 0.0399; // 3,99% de 7 a 12 parcelas
        if (withAnticipation) {
          anticipationRate = 0.0160;
        }
      } else {
        percentageRate = 0.0429; // 4,29% de 13 a 21 parcelas
        if (withAnticipation) {
          anticipationRate = 0.0160;
        }
      }
      break;
  }

  return { percentageRate, fixedFee, anticipationRate };
}

/**
 * Calcula o detalhamento e valor bruto final da cobrança com repasse de taxas Asaas.
 */
export function calculateAsaasFeeBreakdown(params: FeeCalculationParams): FeeBreakdown {
  const {
    netValue,
    billingType,
    installmentCount = 1,
    passFees = true,
    includeWhatsApp = true,
    withAnticipation = false,
  } = params;

  const validNet = Math.max(0, netValue || 0);
  const n = Math.max(1, installmentCount || 1);

  const { percentageRate, fixedFee, anticipationRate } = getAsaasRates(
    billingType,
    n,
    withAnticipation
  );

  const totalPercentageRate = percentageRate + anticipationRate;
  const whatsAppFee = includeWhatsApp ? ASAAS_WHATSAPP_NOTIFICATION_FEE * n : 0;

  if (!passFees || validNet === 0) {
    // Sem repasse de taxas: o cliente paga exatamente o valor líquido e o Asaas desconta da igreja
    const grossValue = validNet;
    const totalFees = (grossValue * totalPercentageRate) + fixedFee + whatsAppFee;
    const realNet = Math.max(0, grossValue - totalFees);

    return {
      netValue: round2(realNet),
      grossValue: round2(grossValue),
      totalFees: round2(totalFees),
      percentageRate,
      fixedFee,
      whatsAppFee,
      anticipationRate,
      installmentCount: n,
      installmentGrossValue: round2(grossValue / n),
      installmentNetValue: round2(realNet / n),
    };
  }

  // FÓRMULA DE REPASSE (Gross-up):
  // GrossValue = (NetValue + fixedFee + whatsAppFee) / (1 - totalPercentageRate)
  const divisor = 1 - totalPercentageRate;
  const numerator = validNet + fixedFee + whatsAppFee;
  const grossValue = divisor > 0 ? numerator / divisor : numerator;
  const totalFees = grossValue - validNet;

  return {
    netValue: round2(validNet),
    grossValue: round2(grossValue),
    totalFees: round2(totalFees),
    percentageRate,
    fixedFee,
    whatsAppFee,
    anticipationRate,
    installmentCount: n,
    installmentGrossValue: round2(grossValue / n),
    installmentNetValue: round2(validNet / n),
  };
}

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}
