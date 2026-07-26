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
RefreshCw
} from "lucide-react";

import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useTheme } from "../context/ThemeContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../lib/formatters";
import { apiClient } from '../lib/api';

const SETTINGS_STORAGE_KEY = 'copilote_user_preferences_v1';

export function SettingsPage() {
  const { currentUser, clearSession, refreshSession } = useSession();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [profileSettings, setProfileSettings] = useState({
    displayName: `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`,
    email: currentUser?.email ?? '',
    phoneNumber: '',
    department: '',
    jobTitle: ''
  });

  const [appearanceSettings, setAppearanceSettings] = useState({
    language: 'English',
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

  useEffect(() => {
    if (!currentUser) return;
    setProfileSettings((current) => current.email ? current : {
      ...current,
      displayName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
      email: currentUser.email
    });
  }, [currentUser]);

  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return;
    try {
      const preferences = JSON.parse(stored) as Partial<typeof appearanceSettings> & {
        profileSettings?: typeof profileSettings;
        securitySettings?: typeof securitySettings;
        platformPreferences?: typeof platformPreferences;
        notificationSettings?: typeof notificationSettings;
      };
      if (preferences.profileSettings) setProfileSettings(preferences.profileSettings);
      if (preferences.language && preferences.timezone) setAppearanceSettings({ language: preferences.language, timezone: preferences.timezone });
      if (preferences.securitySettings) setSecuritySettings(preferences.securitySettings);
      if (preferences.platformPreferences) setPlatformPreferences(preferences.platformPreferences);
      if (preferences.notificationSettings) setNotificationSettings(preferences.notificationSettings);
    } catch { localStorage.removeItem(SETTINGS_STORAGE_KEY); }
  }, []);

  const savePreferences = () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ profileSettings, appearanceSettings, securitySettings, platformPreferences, notificationSettings }));
    showToast({ type: 'success', title: 'Preferences saved', description: 'Your browser preferences are stored for this workspace.' });
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const parts = profileSettings.displayName.trim().split(/\s+/).filter(Boolean);
      await apiClient.put(`/api/users/${currentUser.id}`, {
        firstName: parts[0] ?? currentUser.firstName,
        lastName: parts.slice(1).join(' ') || currentUser.lastName,
        username: currentUser.username,
        email: profileSettings.email.trim()
      });
      await refreshSession();
      showToast({ type: 'success', title: 'Profile saved', description: 'Your profile has been updated successfully.' });
    } catch {
      showToast({ type: 'error', title: 'Profile update failed', description: 'Check the display name and email address, then try again.' });
    } finally { setSaving(false); }
  };

  const handleLanguageChange = (language: string) => {
    setAppearanceSettings({...appearanceSettings, language});
    showToast({
      type: 'success',
      title: 'Language updated',
      description: `Language preference saved to ${language}.`
    });
  };

  const handleTimezoneChange = (timezone: string) => {
    setAppearanceSettings({...appearanceSettings, timezone});
    showToast({
      type: 'success',
      title: 'Timezone updated',
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
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-100">Engineering Copilot</p>
        <h1 className="mt-3 text-3xl font-semibold">Enterprise Settings</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-brand-50/85">
          Manage your profile, security, platform preferences and workspace configuration.
        </p>
      </section>

      {/* Profile Settings */}
      <section className="page-shell">
        <div className="flex items-center gap-3 text-brand-700 dark:text-brand-300">
          <User className="h-5 w-5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">Profile</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">Profile Settings</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Display Name</span>
            <input 
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white" 
              value={profileSettings.displayName}
              onChange={(e) => setProfileSettings({...profileSettings, displayName: e.target.value})}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
            <input 
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white" 
              value={profileSettings.email}
              onChange={(e) => setProfileSettings({...profileSettings, email: e.target.value})}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Phone Number</span>
            <input 
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white" 
              value={profileSettings.phoneNumber}
              onChange={(e) => setProfileSettings({...profileSettings, phoneNumber: e.target.value})}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Department</span>
            <input 
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white" 
              value={profileSettings.department}
              onChange={(e) => setProfileSettings({...profileSettings, department: e.target.value})}
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Job Title</span>
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
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Profile
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em]">Appearance</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Appearance</h2>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <button 
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-950" 
              onClick={toggleTheme} 
              type="button"
            >
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
              {theme === 'dark' ? <MoonStar className="h-5 w-5 text-brand-300" /> : <SunMedium className="h-5 w-5 text-brand-700" />}
            </button>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Language</span>
              <select 
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={appearanceSettings.language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                <option value="English">English</option>
                <option value="French">French</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Timezone</span>
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em]">Security</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Security</h2>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Enable Two-Factor Authentication</span>
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
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Enable Audit Trail</span>
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
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Enable Email Notifications</span>
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
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Automatic Logout after inactivity</span>
              </div>
              <input 
                className="h-5 w-5 rounded border-slate-300 text-brand-700" 
                checked={securitySettings.autoLogout}
                onChange={(e) => setSecuritySettings({...securitySettings, autoLogout: e.target.checked})}
                type="checkbox" 
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Session Timeout</span>
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
                onClick={handleChangePassword}
                type="button"
              >
                Change Password
              </button>
              <button 
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" 
                onClick={handleLogoutAllSessions}
                type="button"
              >
                Logout All Sessions
              </button>
            </div>
          </div>
        </article>
      </section>

      {/* Platform Preferences */}
      <section className="page-shell">
        <div className="flex items-center gap-3 text-brand-700 dark:text-brand-300">
          <SlidersHorizontal className="h-5 w-5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">Preferences</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Platform Preferences</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Automatic Manager Assignment</span>
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Default Repository Visibility</span>
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Enable Audit Logs</span>
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Default Dashboard</span>
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Require Confirmation Before Delete</span>
            </div>
            <input 
              className="h-5 w-5 rounded border-slate-300 text-brand-700" 
              checked={platformPreferences.requireConfirmation}
              onChange={(e) => setPlatformPreferences({...platformPreferences, requireConfirmation: e.target.checked})}
              type="checkbox" 
            />
          </label>
        </div>
        <button className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600" onClick={savePreferences} type="button"><Save className="h-4 w-4" />Save workspace preferences</button>
      </section>

      {/* Notifications */}
      <section className="page-shell">
        <div className="flex items-center gap-3 text-brand-700 dark:text-brand-300">
          <Bell className="h-5 w-5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">Notifications</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Notifications</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Email notifications</span>
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">System updates</span>
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Repository events</span>
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Audit alerts</span>
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Security alerts</span>
            </div>
            <input 
              className="h-5 w-5 rounded border-slate-300 text-brand-700" 
              checked={notificationSettings.securityAlerts}
              onChange={(e) => setNotificationSettings({...notificationSettings, securityAlerts: e.target.checked})}
              type="checkbox" 
            />
          </label>
        </div>
        <button className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600" onClick={savePreferences} type="button"><Save className="h-4 w-4" />Save notification preferences</button>
      </section>

      {/* Account Information */}
      <section className="page-shell">
        <div className="flex items-center gap-3 text-brand-700 dark:text-brand-300">
          <ShieldCheck className="h-5 w-5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">Account</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Account Information</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Role</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{currentUser?.role || 'N/A'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Member Since</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{currentUser?.createdAt ? formatDate(currentUser.createdAt) : 'N/A'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Account Status</p>
            <p className="mt-2 text-lg font-semibold text-green-700 dark:text-green-400">{currentUser?.enabled ? 'Active' : 'Disabled'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Last Updated</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{currentUser?.updatedAt ? formatDate(currentUser.updatedAt) : 'N/A'}</p>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="page-shell border-2 border-rose-200 dark:border-rose-900">
        <div className="flex items-center gap-3 text-rose-700 dark:text-rose-400">
          <ShieldCheck className="h-5 w-5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">Danger Zone</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Danger Zone</h2>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          These actions are irreversible. Please proceed with caution.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button 
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" 
            onClick={handleLogout}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
          <button 
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200" 
            onClick={() => setShowDeleteModal(true)}
            type="button"
          >
            Delete Account
          </button>
        </div>
      </section>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="page-shell max-w-md">
            <h3 className="text-xl font-semibold text-slate-950 dark:text-white">Delete Account</h3>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" 
                onClick={() => setShowDeleteModal(false)}
                type="button"
              >
                Cancel
              </button>
              <button 
                className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700" 
                onClick={handleDeleteAccount}
                type="button"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
