export interface SendNotificationRequest {
  tenantId: string;
  recipientPhone: string;
  recipientName?: string;
  messageText: string;
  mediaUrl?: string;
}

export interface NotificationResult {
  messageId: string;
  status: 'SENT' | 'QUEUED' | 'FAILED';
  deliveredAt?: string;
}

/**
 * Domain NotificationProvider Abstraction Interface.
 * Decouples core notification rules from specific WhatsApp gateways (Evolution, Z-API, Baileys).
 */
export interface NotificationProvider {
  sendMessage(request: SendNotificationRequest): Promise<NotificationResult>;
}
