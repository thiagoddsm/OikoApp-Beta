export interface CampaignRecipient {
  id: string;
  name: string;
  phone: string;
  isNewChat?: boolean; // Contato frio que nunca conversou com o número
}

export interface CampaignMessageVersion {
  id: string;
  label: string; // "Versão A", "Versão B"
  text: string;
  approved: boolean;
}

export interface Campaign {
  id?: string;
  title: string;
  recipients: CampaignRecipient[];
  versions: CampaignMessageVersion[];
  hasLinks: boolean;
  type: 'text' | 'media' | 'survey' | 'button' | 'list' | 'contact';
  channel: string; // 'whatsapp', 'telegram', 'email', 'sms'
  createdAt?: string;
  requestedDelayMinSeconds?: number;
  requestedDelayMaxSeconds?: number;
}
