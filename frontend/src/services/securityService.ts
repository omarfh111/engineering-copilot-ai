import { apiClient } from '../lib/api';

export const securityService = {
  async changePassword(currentPassword: string, newPassword: string) {
    try {
      await apiClient.put('/api/users/me/password', {
        currentPassword,
        newPassword
      });
      return { synced: true };
    } catch (error) {
      console.warn('Backend 500 error on /api/admin/users/*, using local fallback data', error);
      localStorage.setItem('copilote_pending_password_change', JSON.stringify({ changedAt: new Date().toISOString() }));
      return { synced: false };
    }
  },

  async resetUserPassword(userId: number, newPassword: string) {
    try {
      await apiClient.put(`/api/admin/users/${userId}/password`, {
        newPassword
      });
      return { synced: true };
    } catch (error) {
      console.warn(`Backend 500 error on /api/admin/users/${userId}/password, using local fallback data`, error);
      localStorage.setItem(`copilote_pending_password_reset:${userId}`, JSON.stringify({ changedAt: new Date().toISOString() }));
      return { synced: false };
    }
  }
};
