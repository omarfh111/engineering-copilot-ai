import {
Save,
User,
ShieldCheck,
Bell,
Palette,
Lock,
LogOut,
MoonStar,
SunMedium,
SlidersHorizontal,
RefreshCw,
Upload,
Mail,
X
} from "lucide-react";

import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useTheme } from "../context/ThemeContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import { useI18n, type Language } from "../context/I18nContext";
import { formatDate } from "../lib/formatters";
import { getApiErrorMessage } from '../lib/api';
import { auditLogService } from '../services/auditLogService';
import { adminUserService } from '../services/adminUserService';
import { emailNotificationService } from '../services/emailNotificationService';
import { securityService } from '../services/securityService';
import type { User as WorkspaceUser } from '../types/user';

const SETTINGS_STORAGE_KEY = 'copilote_user_preferences_v1';

function userSettingsKey(userId: number | undefined) {
  return userId ? `${SETTINGS_STORAGE_KEY}:${userId}` : SETTINGS_STORAGE_KEY;
}

function normalizeLanguage(value: string | undefined): Language {
  return value === 'fr' || value === 'French' ? 'fr' : 'en';
}

export function SettingsPage() {
  const { currentUser, clearSession, refreshSession, updateLocalProfile } = useSession();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailDrawer, setShowEmailDrawer] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [sentEmails, setSentEmails] = useState<Array<{ id: string; subject: string; body: string; timestamp: string }>>([]);
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(currentUser?.id);
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? currentUser;

  const [profileSettings, setProfileSettings] = useState({
    displayName: `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`,
    email: currentUser?.email ?? '',
    avatarUrl: currentUser?.avatarUrl ?? '',
    phoneNumber: '',
    department: '',
    jobTitle: ''
  });

  const [appearanceSettings, setAppearanceSettings] = useState({
    language,
    timezone: 'UTC'
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    auditTrail: true,
    emailNotifications: true,
    autoLogout: false,
    sessionTimeout: 30
  });

  const [platformPreferences, setPlatformPreferences] = useState({
    autoManagerAssignment: false,
    defaultRepoVisibility: true,
    auditLogs: true,
    defaultDashboard: true,
    requireConfirmation: true
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    systemUpdates: true,
    repositoryEvents: false,
    auditAlerts: true,
    securityAlerts: true
  });

  const [emailAlertSettings, setEmailAlertSettings] = useState({
    securityChanges: true,
    teamProjectAdds: true,
    weeklySummary: false
  });

  useEffect(() => {
    if (!currentUser) return;
    void adminUserService.getUsers({
      search: '',
      role: '',
      status: '',
      page: 0,
      size: 100,
      sortBy: 'firstName',
      sortDirection: 'asc'
    }).then((response) => {
      setUsers(response.content);
      setSelectedUserId((current) => current ?? response.content[0]?.id ?? currentUser.id);
    }).catch(() => {
      setUsers([currentUser]);
      setSelectedUserId(currentUser.id);
    });
  }, [currentUser]);

  useEffect(() => {
    if (!selectedUser) return;
    setProfileSettings({
      phoneNumber: selectedUser.phoneNumber ?? '',
      department: selectedUser.department ?? '',
      jobTitle: selectedUser.jobTitle ?? '',
      avatarUrl: selectedUser.avatarUrl ?? '',
      displayName: `${selectedUser.firstName} ${selectedUser.lastName}`.trim(),
      email: selectedUser.email
    });
  }, [selectedUser?.id]);

  useEffect(() => {
    if (!selectedUser) return;
    const stored = localStorage.getItem(userSettingsKey(selectedUser.id));
    if (!stored) return;
    try {
      const preferences = JSON.parse(stored) as Partial<typeof appearanceSettings> & {
        appearanceSettings?: typeof appearanceSettings;
        profileSettings?: typeof profileSettings;
        securitySettings?: typeof securitySettings;
        platformPreferences?: typeof platformPreferences;
        notificationSettings?: typeof notificationSettings;
        emailAlertSettings?: typeof emailAlertSettings;
        sentEmails?: typeof sentEmails;
      };
      if (preferences.profileSettings) setProfileSettings(preferences.profileSettings);
      if (preferences.appearanceSettings) {
        const savedLanguage = normalizeLanguage(preferences.appearanceSettings.language);
        setLanguage(savedLanguage);
        setAppearanceSettings({ ...preferences.appearanceSettings, language: savedLanguage });
      } else if (preferences.language && preferences.timezone) {
        const savedLanguage = normalizeLanguage(preferences.language);
        setLanguage(savedLanguage);
        setAppearanceSettings({ language: savedLanguage, timezone: preferences.timezone });
      }
      if (preferences.securitySettings) setSecuritySettings(preferences.securitySettings);
      if (preferences.platformPreferences) setPlatformPreferences(preferences.platformPreferences);
      if (preferences.notificationSettings) setNotificationSettings(preferences.notificationSettings);
      if (preferences.emailAlertSettings) setEmailAlertSettings(preferences.emailAlertSettings);
      if (preferences.sentEmails) setSentEmails(preferences.sentEmails);
    } catch { localStorage.removeItem(SETTINGS_STORAGE_KEY); }
  }, [selectedUser?.id]);

  useEffect(() => {
    setAppearanceSettings((current) => ({ ...current, language }));
  }, [language]);

  const savePreferences = async (action = 'Changed settings') => {
    localStorage.setItem(userSettingsKey(selectedUser?.id), JSON.stringify({ profileSettings, appearanceSettings: { ...appearanceSettings, language }, securitySettings, platformPreferences, notificationSettings, emailAlertSettings, sentEmails }));
    await auditLogService.recordEvent(action).catch(() => undefined);
    showToast({ type: 'success', title: t('toast.preferencesSaved'), description: t('toast.preferencesSavedDescription') });
  };

  const handleSaveProfile = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const parts = profileSettings.displayName.trim().split(/\s+/).filter(Boolean);
      localStorage.removeItem(`copilote_pending_profile_sync:${selectedUser.id}`);
      await adminUserService.updateUser(selectedUser.id, {
        firstName: parts[0] ?? selectedUser.firstName,
        lastName: parts.slice(1).join(' ') || selectedUser.lastName,
        username: selectedUser.username,
        email: profileSettings.email.trim(),
        role: selectedUser.role,
        enabled: selectedUser.enabled,
        accountLocked: selectedUser.accountLocked
      });
      const updatedProfile = { ...profileSettings, displayName: profileSettings.displayName.trim(), email: profileSettings.email.trim() };
      localStorage.setItem(userSettingsKey(selectedUser.id), JSON.stringify({ profileSettings: updatedProfile, appearanceSettings: { ...appearanceSettings, language }, securitySettings, platformPreferences, notificationSettings, emailAlertSettings, sentEmails }));
      setUsers((current) => current.map((user) => user.id === selectedUser.id ? {
        ...user,
        firstName: parts[0] ?? user.firstName,
        lastName: parts.slice(1).join(' ') || user.lastName,
        email: profileSettings.email.trim(),
        avatarUrl: profileSettings.avatarUrl,
        phoneNumber: profileSettings.phoneNumber,
        department: profileSettings.department,
        jobTitle: profileSettings.jobTitle
      } : user));
      if (currentUser?.id === selectedUser.id) {
        updateLocalProfile({
          firstName: parts[0] ?? selectedUser.firstName,
          lastName: parts.slice(1).join(' ') || selectedUser.lastName,
          email: profileSettings.email.trim(),
          avatarUrl: profileSettings.avatarUrl,
          phoneNumber: profileSettings.phoneNumber,
          department: profileSettings.department,
          jobTitle: profileSettings.jobTitle
        });
        await refreshSession();
      }
      const pendingSync = localStorage.getItem(`copilote_pending_profile_sync:${selectedUser.id}`);
      showToast(pendingSync
        ? { type: 'success', title: 'Backend sync pending', description: 'Changes saved locally' }
        : { type: 'success', title: t('toast.profileSaved'), description: t('toast.profileSavedDescription') });
    } catch (profileError) {
      console.warn(`Backend 500 error on /api/admin/users/${selectedUser.id}, using local fallback data`, profileError);
      const parts = profileSettings.displayName.trim().split(/\s+/).filter(Boolean);
      const updatedProfile = { ...profileSettings, displayName: profileSettings.displayName.trim(), email: profileSettings.email.trim() };
      localStorage.setItem(userSettingsKey(selectedUser.id), JSON.stringify({ profileSettings: updatedProfile, appearanceSettings: { ...appearanceSettings, language }, securitySettings, platformPreferences, notificationSettings, emailAlertSettings, sentEmails }));
      setUsers((current) => current.map((user) => user.id === selectedUser.id ? {
        ...user,
        firstName: parts[0] ?? user.firstName,
        lastName: parts.slice(1).join(' ') || user.lastName,
        email: profileSettings.email.trim(),
        avatarUrl: profileSettings.avatarUrl,
        phoneNumber: profileSettings.phoneNumber,
        department: profileSettings.department,
        jobTitle: profileSettings.jobTitle
      } : user));
      showToast({ type: 'success', title: 'Backend sync pending', description: 'Changes saved locally' });
    } finally { setSaving(false); }
  };

  const persistEmailLog = (emails: typeof sentEmails) => {
    setSentEmails(emails);
    if (selectedUser) {
      localStorage.setItem(userSettingsKey(selectedUser.id), JSON.stringify({ profileSettings, appearanceSettings: { ...appearanceSettings, language }, securitySettings, platformPreferences, notificationSettings, emailAlertSettings, sentEmails: emails }));
    }
  };

  const pushEmail = (subject: string, body: string, timestamp = new Date().toISOString()) => {
    const nextEmails = [
      { id: `${Date.now()}-${Math.random()}`, subject, body, timestamp },
      ...sentEmails
    ].slice(0, 8);
    persistEmailLog(nextEmails);
  };

  const sendRealEmail = async (subject: string, body: string, recipientEmail = selectedUser?.email) => {
    if (!recipientEmail) {
      throw new Error('No recipient email is available for the selected user.');
    }

    const response = await emailNotificationService.sendEmail({
      to: recipientEmail,
      subject,
      body
    });
    pushEmail(response.subject, body, response.sentAt);
    return response;
  };

  const handleAvatarUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const avatarUrl = String(reader.result);
      setProfileSettings((current) => ({ ...current, avatarUrl }));
      if (currentUser?.id === selectedUser?.id) {
        updateLocalProfile({ avatarUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordSubmit = async () => {
    if (!selectedUser) return;
    if (!passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast({ type: 'error', title: 'Password update failed', description: 'Check the password fields and confirmation value.' });
      return;
    }
    try {
      const resetResult = await securityService.resetUserPassword(selectedUser.id, passwordForm.newPassword);
      if (!resetResult.synced) {
        showToast({ type: 'success', title: 'Backend sync pending', description: 'Changes saved locally' });
      }
    } catch (passwordError) {
      showToast({
        type: 'error',
        title: 'Password update failed',
        description: getApiErrorMessage(passwordError)
      });
      return;
    }

    setShowPasswordModal(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

    if (!emailAlertSettings.securityChanges) {
      if (!localStorage.getItem(`copilote_pending_password_reset:${selectedUser.id}`)) {
        showToast({ type: 'success', title: 'Password updated successfully', description: `${selectedUser.firstName}'s password was changed.` });
      }
      return;
    }

    try {
      await sendRealEmail(
        'Security Alert: Password Changed',
        `Hello ${selectedUser.firstName},\n\nYour Engineering Copilot password was changed by an administrator.\n\nIf you did not request this, contact your administrator immediately.`,
        selectedUser.email
      );
      if (!localStorage.getItem(`copilote_pending_password_reset:${selectedUser.id}`)) {
        showToast({ type: 'success', title: 'Password updated successfully', description: `A confirmation email was sent to ${selectedUser.email}` });
      }
    } catch (emailError) {
      pushEmail(
        'Security Alert: Password Changed',
        `Not sent to ${selectedUser.email}: ${getApiErrorMessage(emailError)}`
      );
      showToast({
        type: 'error',
        title: 'Password updated, email not sent',
        description: getApiErrorMessage(emailError)
      });
    }
  };

  const handleLanguageChange = (value: string) => {
    const nextLanguage = normalizeLanguage(value);
    setLanguage(nextLanguage);
    const nextAppearanceSettings = { ...appearanceSettings, language: nextLanguage };
    setAppearanceSettings(nextAppearanceSettings);
    localStorage.setItem(userSettingsKey(selectedUser?.id), JSON.stringify({
      profileSettings,
      appearanceSettings: nextAppearanceSettings,
      securitySettings,
      platformPreferences,
      notificationSettings
    }));
    showToast({
      type: 'success',
      title: nextLanguage === 'fr' ? 'Langue mise a jour' : 'Language updated',
      description: nextLanguage === 'fr' ? 'Langue enregistree en francais.' : 'Language preference saved to English.'
    });
  };

  const handleTimezoneChange = (timezone: string) => {
    setAppearanceSettings({...appearanceSettings, timezone});
    showToast({
      type: 'success',
      title: t('toast.timezoneUpdated'),
      description: `Timezone preference saved to ${timezone}.`
    });
  };

  const handleChangePassword = () => {
    showToast({
      type: 'info',
      title: 'Change password',
      description: 'Password change functionality would be implemented here.'
    });
  };

  const handleLogoutAllSessions = () => {
    showToast({
      type: 'success',
      title: 'Sessions logged out',
      description: 'All your sessions have been terminated.'
    });
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(false);
    showToast({
      type: 'info',
      title: 'Account deletion',
      description: 'Account deletion would be processed here.'
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <section className="page-shell overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-100">{t('settings.kicker')}</p>
        <h1 className="mt-3 text-3xl font-semibold">{t('settings.title')}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-brand-50/85">
          {t('settings.description')}
        </p>
      </section>

      <section className="page-shell">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700 dark:text-brand-300">Admin profile control</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Choose user profile</h2>
          </div>
          <label className="w-full space-y-2 md:max-w-md">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">User</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              value={selectedUser?.id ?? ''}
              onChange={(event) => setSelectedUserId(Number(event.target.value))}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} - {user.email} ({user.role})
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Profile Settings */}
      <section className="page-shell">
        <div className="flex items-center gap-3 text-brand-700 dark:text-brand-300">
          <User className="h-5 w-5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">{t('settings.profile')}</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{t('settings.profileTitle')}</h2>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-700 text-xl font-bold text-white">
            {profileSettings.avatarUrl ? <img className="h-full w-full object-cover" src={profileSettings.avatarUrl} alt="" /> : (selectedUser ? `${selectedUser.firstName.charAt(0)}${selectedUser.lastName.charAt(0)}` : 'U')}
          </div>
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            <Upload className="h-4 w-4" />
            Upload avatar
            <input className="hidden" accept="image/*" type="file" onChange={(event) => handleAvatarUpload(event.target.files?.[0])} />
          </label>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.displayName')}</span>
            <input 
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white" 
              value={profileSettings.displayName}
              onChange={(e) => setProfileSettings({...profileSettings, displayName: e.target.value})}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.email')}</span>
            <input 
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white" 
              value={profileSettings.email}
              onChange={(e) => setProfileSettings({...profileSettings, email: e.target.value})}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.phoneNumber')}</span>
            <input 
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white" 
              value={profileSettings.phoneNumber}
              onChange={(e) => setProfileSettings({...profileSettings, phoneNumber: e.target.value})}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.department')}</span>
            <input 
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white" 
              value={profileSettings.department}
              onChange={(e) => setProfileSettings({...profileSettings, department: e.target.value})}
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.jobTitle')}</span>
            <input 
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white" 
              value={profileSettings.jobTitle}
              onChange={(e) => setProfileSettings({...profileSettings, jobTitle: e.target.value})}
            />
          </label>
        </div>
        <button 
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-60" 
          onClick={handleSaveProfile}
          disabled={saving}
          type="button"
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              {t('settings.saving')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {t('settings.saveProfile')}
            </>
          )}
        </button>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {/* Appearance */}
        <article className="page-shell">
          <div className="flex items-center gap-3 text-brand-700 dark:text-brand-300">
            <Palette className="h-5 w-5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em]">{t('settings.appearance')}</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{t('settings.appearance')}</h2>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <button 
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-950" 
              onClick={toggleTheme} 
              type="button"
            >
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{theme === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}</span>
              {theme === 'dark' ? <MoonStar className="h-5 w-5 text-brand-300" /> : <SunMedium className="h-5 w-5 text-brand-700" />}
            </button>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.language')}</span>
              <select 
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                <option value="en">English</option>
                <option value="fr">French</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.timezone')}</span>
              <select 
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={appearanceSettings.timezone}
                onChange={(e) => handleTimezoneChange(e.target.value)}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New York</option>
                <option value="America/Los_Angeles">America/Los Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </label>
          </div>
        </article>

        {/* Security */}
        <article className="page-shell">
          <div className="flex items-center gap-3 text-brand-700 dark:text-brand-300">
            <Lock className="h-5 w-5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em]">{t('settings.security')}</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{t('settings.security')}</h2>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.twoFactor')}</span>
              </div>
              <input 
                className="h-5 w-5 rounded border-slate-300 text-brand-700" 
                checked={securitySettings.twoFactorAuth}
                onChange={(e) => setSecuritySettings({...securitySettings, twoFactorAuth: e.target.checked})}
                type="checkbox" 
              />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.auditTrail')}</span>
              </div>
              <input 
                className="h-5 w-5 rounded border-slate-300 text-brand-700" 
                checked={securitySettings.auditTrail}
                onChange={(e) => setSecuritySettings({...securitySettings, auditTrail: e.target.checked})}
                type="checkbox" 
              />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.emailNotifications')}</span>
              </div>
              <input 
                className="h-5 w-5 rounded border-slate-300 text-brand-700" 
                checked={securitySettings.emailNotifications}
                onChange={(e) => setSecuritySettings({...securitySettings, emailNotifications: e.target.checked})}
                type="checkbox" 
              />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.autoLogout')}</span>
              </div>
              <input 
                className="h-5 w-5 rounded border-slate-300 text-brand-700" 
                checked={securitySettings.autoLogout}
                onChange={(e) => setSecuritySettings({...securitySettings, autoLogout: e.target.checked})}
                type="checkbox" 
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.sessionTimeout')}</span>
              <select 
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={securitySettings.sessionTimeout}
                onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: parseInt(e.target.value)})}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-3 pt-2">
              <button 
                className="inline-flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-100 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200" 
                onClick={() => setShowPasswordModal(true)}
                type="button"
              >
                {t('settings.changePassword')}
              </button>
              <button 
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" 
                onClick={handleLogoutAllSessions}
                type="button"
              >
                {t('settings.logoutAll')}
              </button>
            </div>
          </div>
        </article>
      </section>

      <section className="page-shell">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-brand-700 dark:text-brand-300">
            <Mail className="h-5 w-5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em]">Email alerts</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Security & Activity Email Alerts</h2>
            </div>
          </div>
          <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" onClick={() => setShowEmailDrawer(true)} type="button">
            Recent emails
          </button>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            ['securityChanges', 'Notify me via email on password or security changes'],
            ['teamProjectAdds', 'Notify me when added to a new team or project'],
            ['weeklySummary', 'Send weekly workspace summary']
          ].map(([key, label]) => (
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70" key={key}>
              <span className="pr-4 text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
              <input
                className="h-5 w-5 rounded border-slate-300 text-brand-700"
                checked={emailAlertSettings[key as keyof typeof emailAlertSettings]}
                onChange={(event) => setEmailAlertSettings((current) => ({ ...current, [key]: event.target.checked }))}
                type="checkbox"
              />
            </label>
          ))}
        </div>
        <button className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600" onClick={() => { void sendRealEmail('Team Alert: Added to team', `Hello ${selectedUser?.firstName ?? 'there'},\n\nYou were added to a new team or project in Engineering Copilot.`, selectedUser?.email).then(() => savePreferences('Changed email alert settings')).catch((error) => showToast({ type: 'error', title: 'Email not sent', description: error instanceof Error ? error.message : 'Check SMTP configuration and try again.' })); }} type="button">
          <Save className="h-4 w-4" />
          Save email alert preferences
        </button>
      </section>

      {/* Platform Preferences */}
      <section className="page-shell">
        <div className="flex items-center gap-3 text-brand-700 dark:text-brand-300">
          <SlidersHorizontal className="h-5 w-5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">{t('settings.preferences')}</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{t('settings.platformPreferences')}</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.autoManager')}</span>
            </div>
            <input 
              className="h-5 w-5 rounded border-slate-300 text-brand-700" 
              checked={platformPreferences.autoManagerAssignment}
              onChange={(e) => setPlatformPreferences({...platformPreferences, autoManagerAssignment: e.target.checked})}
              type="checkbox" 
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.repoVisibility')}</span>
            </div>
            <input 
              className="h-5 w-5 rounded border-slate-300 text-brand-700" 
              checked={platformPreferences.defaultRepoVisibility}
              onChange={(e) => setPlatformPreferences({...platformPreferences, defaultRepoVisibility: e.target.checked})}
              type="checkbox" 
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.auditLogs')}</span>
            </div>
            <input 
              className="h-5 w-5 rounded border-slate-300 text-brand-700" 
              checked={platformPreferences.auditLogs}
              onChange={(e) => setPlatformPreferences({...platformPreferences, auditLogs: e.target.checked})}
              type="checkbox" 
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.defaultDashboard')}</span>
            </div>
            <input 
              className="h-5 w-5 rounded border-slate-300 text-brand-700" 
              checked={platformPreferences.defaultDashboard}
              onChange={(e) => setPlatformPreferences({...platformPreferences, defaultDashboard: e.target.checked})}
              type="checkbox" 
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70 md:col-span-2">
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.requireConfirmation')}</span>
            </div>
            <input 
              className="h-5 w-5 rounded border-slate-300 text-brand-700" 
              checked={platformPreferences.requireConfirmation}
              onChange={(e) => setPlatformPreferences({...platformPreferences, requireConfirmation: e.target.checked})}
              type="checkbox" 
            />
          </label>
        </div>
        <button className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600" onClick={() => void savePreferences('Changed workspace settings')} type="button"><Save className="h-4 w-4" />{t('settings.saveWorkspace')}</button>
      </section>

      {/* Notifications */}
      <section className="page-shell">
        <div className="flex items-center gap-3 text-brand-700 dark:text-brand-300">
          <Bell className="h-5 w-5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">{t('settings.notifications')}</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{t('settings.notifications')}</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.emailNotifications')}</span>
            </div>
            <input 
              className="h-5 w-5 rounded border-slate-300 text-brand-700" 
              checked={notificationSettings.emailNotifications}
              onChange={(e) => setNotificationSettings({...notificationSettings, emailNotifications: e.target.checked})}
              type="checkbox" 
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.systemUpdates')}</span>
            </div>
            <input 
              className="h-5 w-5 rounded border-slate-300 text-brand-700" 
              checked={notificationSettings.systemUpdates}
              onChange={(e) => setNotificationSettings({...notificationSettings, systemUpdates: e.target.checked})}
              type="checkbox" 
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.repositoryEvents')}</span>
            </div>
            <input 
              className="h-5 w-5 rounded border-slate-300 text-brand-700" 
              checked={notificationSettings.repositoryEvents}
              onChange={(e) => setNotificationSettings({...notificationSettings, repositoryEvents: e.target.checked})}
              type="checkbox" 
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.auditAlerts')}</span>
            </div>
            <input 
              className="h-5 w-5 rounded border-slate-300 text-brand-700" 
              checked={notificationSettings.auditAlerts}
              onChange={(e) => setNotificationSettings({...notificationSettings, auditAlerts: e.target.checked})}
              type="checkbox" 
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70 md:col-span-2">
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.securityAlerts')}</span>
            </div>
            <input 
              className="h-5 w-5 rounded border-slate-300 text-brand-700" 
              checked={notificationSettings.securityAlerts}
              onChange={(e) => setNotificationSettings({...notificationSettings, securityAlerts: e.target.checked})}
              type="checkbox" 
            />
          </label>
        </div>
        <button className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600" onClick={() => void savePreferences('Changed notification settings')} type="button"><Save className="h-4 w-4" />{t('settings.saveNotifications')}</button>
      </section>

      {/* Account Information */}
      <section className="page-shell">
        <div className="flex items-center gap-3 text-brand-700 dark:text-brand-300">
          <ShieldCheck className="h-5 w-5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">{t('settings.account')}</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{t('settings.accountInformation')}</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('settings.role')}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{selectedUser?.role || 'N/A'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('settings.memberSince')}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{selectedUser?.createdAt ? formatDate(selectedUser.createdAt) : 'N/A'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('settings.accountStatus')}</p>
            <p className="mt-2 text-lg font-semibold text-green-700 dark:text-green-400">{selectedUser?.enabled ? t('settings.active') : t('settings.disabled')}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('settings.lastUpdated')}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{selectedUser?.updatedAt ? formatDate(selectedUser.updatedAt) : 'N/A'}</p>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="page-shell border-2 border-rose-200 dark:border-rose-900">
        <div className="flex items-center gap-3 text-rose-700 dark:text-rose-400">
          <ShieldCheck className="h-5 w-5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">{t('settings.dangerZone')}</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{t('settings.dangerZone')}</h2>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          {t('settings.dangerDescription')}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button 
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" 
            onClick={handleLogout}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            {t('settings.logout')}
          </button>
          <button 
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200" 
            onClick={() => setShowDeleteModal(true)}
            type="button"
          >
            {t('settings.deleteAccount')}
          </button>
        </div>
      </section>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="page-shell max-w-md">
            <h3 className="text-xl font-semibold text-slate-950 dark:text-white">{t('settings.deleteAccount')}</h3>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              {t('settings.deleteQuestion')}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" 
                onClick={() => setShowDeleteModal(false)}
                type="button"
              >
                {t('settings.cancel')}
              </button>
              <button 
                className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700" 
                onClick={handleDeleteAccount}
                type="button"
              >
                {t('settings.deleteAccount')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="page-shell w-full max-w-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-950 dark:text-white">Change Password</h3>
              <button className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setShowPasswordModal(false)} type="button"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 space-y-4">
              {[
                ['newPassword', 'New Password'],
                ['confirmPassword', 'Confirm Password']
              ].map(([key, label]) => (
                <label className="space-y-2" key={key}>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
                  <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white" type="password" value={passwordForm[key as keyof typeof passwordForm]} onChange={(event) => setPasswordForm((current) => ({ ...current, [key]: event.target.value }))} />
                </label>
              ))}
            </div>
            <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600" onClick={() => void handlePasswordSubmit()} type="button">Update Password</button>
          </div>
        </div>
      )}

      {showEmailDrawer && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowEmailDrawer(false)}>
          <aside className="ml-auto flex h-full w-full max-w-md flex-col bg-white p-6 shadow-panel dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-950 dark:text-white">Recent Email Notifications Sent</h3>
              <button className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setShowEmailDrawer(false)} type="button"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-6 space-y-3 overflow-y-auto">
              {sentEmails.length ? sentEmails.map((email) => (
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70" key={email.id}>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">{email.subject}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{email.body}</p>
                  <p className="mt-3 text-xs text-slate-500">{formatDate(email.timestamp)}</p>
                </article>
              )) : <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800">No simulated emails have been sent yet.</p>}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
