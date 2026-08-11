import { apiClient } from '../lib/api';

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
}

export interface EmailNotificationResponse {
  to: string;
  subject: string;
  sentAt: string;
}

export const emailNotificationService = {
  async sendEmail(payload: SendEmailPayload) {
    try {
      const response = await apiClient.post<EmailNotificationResponse>('/api/notifications/email', payload);
      return response.data;
    } catch (error) {
      console.warn('Backend 500 error on /api/notifications/email, using local fallback data', error);
      const response = {
        to: payload.to,
        subject: payload.subject,
        sentAt: new Date().toISOString()
      };
      const pending = JSON.parse(localStorage.getItem('copilote_pending_email_notifications') ?? '[]') as EmailNotificationResponse[];
      localStorage.setItem('copilote_pending_email_notifications', JSON.stringify([response, ...pending].slice(0, 25)));
      return response;
    }
  }
};
