import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'en' | 'fr';

const LANGUAGE_STORAGE_KEY = 'copilote_language';

const translations = {
  en: {
    'app.enterpriseDashboard': 'Enterprise Dashboard',
    'app.searchPlaceholder': 'Search users, teams, repositories, analyses...',
    'app.signOut': 'Sign out',
    'sidebar.activeWorkspace': 'Active workspace',
    'sidebar.workspaceReady': 'Workspace ready',
    'loading.dashboard': 'Loading your dashboard...',
    'settings.kicker': 'Engineering Copilot',
    'settings.title': 'Enterprise Settings',
    'settings.description': 'Manage your profile, security, platform preferences and workspace configuration.',
    'settings.profile': 'Profile',
    'settings.profileTitle': 'Profile Settings',
    'settings.displayName': 'Display Name',
    'settings.email': 'Email',
    'settings.phoneNumber': 'Phone Number',
    'settings.department': 'Department',
    'settings.jobTitle': 'Job Title',
    'settings.saveProfile': 'Save Profile',
    'settings.saving': 'Saving...',
    'settings.appearance': 'Appearance',
    'settings.darkMode': 'Dark mode',
    'settings.lightMode': 'Light mode',
    'settings.language': 'Language',
    'settings.timezone': 'Timezone',
    'settings.security': 'Security',
    'settings.twoFactor': 'Enable Two-Factor Authentication',
    'settings.auditTrail': 'Enable Audit Trail',
    'settings.emailNotifications': 'Enable Email Notifications',
    'settings.autoLogout': 'Automatic Logout after inactivity',
    'settings.sessionTimeout': 'Session Timeout',
    'settings.changePassword': 'Change Password',
    'settings.logoutAll': 'Logout All Sessions',
    'settings.preferences': 'Preferences',
    'settings.platformPreferences': 'Platform Preferences',
    'settings.autoManager': 'Automatic Manager Assignment',
    'settings.repoVisibility': 'Default Repository Visibility',
    'settings.auditLogs': 'Enable Audit Logs',
    'settings.defaultDashboard': 'Default Dashboard',
    'settings.requireConfirmation': 'Require Confirmation Before Delete',
    'settings.saveWorkspace': 'Save workspace preferences',
    'settings.notifications': 'Notifications',
    'settings.systemUpdates': 'System updates',
    'settings.repositoryEvents': 'Repository events',
    'settings.auditAlerts': 'Audit alerts',
    'settings.securityAlerts': 'Security alerts',
    'settings.saveNotifications': 'Save notification preferences',
    'settings.account': 'Account',
    'settings.accountInformation': 'Account Information',
    'settings.role': 'Role',
    'settings.memberSince': 'Member Since',
    'settings.accountStatus': 'Account Status',
    'settings.lastUpdated': 'Last Updated',
    'settings.active': 'Active',
    'settings.disabled': 'Disabled',
    'settings.dangerZone': 'Danger Zone',
    'settings.dangerDescription': 'These actions are irreversible. Please proceed with caution.',
    'settings.logout': 'Logout',
    'settings.deleteAccount': 'Delete Account',
    'settings.deleteQuestion': 'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.',
    'settings.cancel': 'Cancel',
    'toast.preferencesSaved': 'Preferences saved',
    'toast.preferencesSavedDescription': 'Your browser preferences are stored for this workspace.',
    'toast.profileSaved': 'Profile saved',
    'toast.profileSavedDescription': 'Your profile has been updated successfully.',
    'toast.profileFailed': 'Profile update failed',
    'toast.profileFailedDescription': 'Check the display name and email address, then try again.',
    'toast.languageUpdated': 'Language updated',
    'toast.timezoneUpdated': 'Timezone updated',
    'nav.dashboard': 'Dashboard',
    'nav.users': 'Users',
    'nav.teams': 'Teams',
    'nav.projects': 'Projects',
    'nav.repositories': 'Repositories',
    'nav.documents': 'Documents',
    'nav.documentation': 'Documentation',
    'nav.analyses': 'Analyses',
    'nav.reviews': 'Reviews',
    'nav.todos': 'Todos',
    'nav.conversations': 'Conversations',
    'nav.assistant': 'Assistant',
    'nav.settings': 'Settings',
    'nav.audit': 'Audit',
    'nav.systemHealth': 'System Health',
    'nav.reports': 'Reports',
    'nav.sprint': 'Sprint',
    'nav.architecture': 'Architecture',
    'nav.dependencies': 'Dependencies',
    'nav.impact': 'Impact',
    'nav.quality': 'Quality',
    'nav.security': 'Security',
    'nav.myTodos': 'My Todos'
  },
  fr: {
    'app.enterpriseDashboard': 'Tableau de bord entreprise',
    'app.searchPlaceholder': 'Rechercher utilisateurs, equipes, depots, analyses...',
    'app.signOut': 'Se deconnecter',
    'sidebar.activeWorkspace': 'Espace actif',
    'sidebar.workspaceReady': 'Espace pret',
    'loading.dashboard': 'Chargement de votre tableau de bord...',
    'settings.kicker': 'Engineering Copilot',
    'settings.title': 'Parametres entreprise',
    'settings.description': 'Gerez votre profil, la securite, les preferences et la configuration de l espace.',
    'settings.profile': 'Profil',
    'settings.profileTitle': 'Parametres du profil',
    'settings.displayName': 'Nom affiche',
    'settings.email': 'Email',
    'settings.phoneNumber': 'Telephone',
    'settings.department': 'Departement',
    'settings.jobTitle': 'Poste',
    'settings.saveProfile': 'Enregistrer le profil',
    'settings.saving': 'Enregistrement...',
    'settings.appearance': 'Apparence',
    'settings.darkMode': 'Mode sombre',
    'settings.lightMode': 'Mode clair',
    'settings.language': 'Langue',
    'settings.timezone': 'Fuseau horaire',
    'settings.security': 'Securite',
    'settings.twoFactor': 'Activer l authentification a deux facteurs',
    'settings.auditTrail': 'Activer la piste d audit',
    'settings.emailNotifications': 'Activer les notifications email',
    'settings.autoLogout': 'Deconnexion automatique apres inactivite',
    'settings.sessionTimeout': 'Expiration de session',
    'settings.changePassword': 'Changer le mot de passe',
    'settings.logoutAll': 'Fermer toutes les sessions',
    'settings.preferences': 'Preferences',
    'settings.platformPreferences': 'Preferences de plateforme',
    'settings.autoManager': 'Affectation automatique du manager',
    'settings.repoVisibility': 'Visibilite par defaut des depots',
    'settings.auditLogs': 'Activer les journaux d audit',
    'settings.defaultDashboard': 'Tableau de bord par defaut',
    'settings.requireConfirmation': 'Demander confirmation avant suppression',
    'settings.saveWorkspace': 'Enregistrer les preferences',
    'settings.notifications': 'Notifications',
    'settings.systemUpdates': 'Mises a jour systeme',
    'settings.repositoryEvents': 'Evenements des depots',
    'settings.auditAlerts': 'Alertes d audit',
    'settings.securityAlerts': 'Alertes de securite',
    'settings.saveNotifications': 'Enregistrer les notifications',
    'settings.account': 'Compte',
    'settings.accountInformation': 'Informations du compte',
    'settings.role': 'Role',
    'settings.memberSince': 'Membre depuis',
    'settings.accountStatus': 'Statut du compte',
    'settings.lastUpdated': 'Derniere mise a jour',
    'settings.active': 'Actif',
    'settings.disabled': 'Desactive',
    'settings.dangerZone': 'Zone sensible',
    'settings.dangerDescription': 'Ces actions sont irreversibles. Procedez avec prudence.',
    'settings.logout': 'Deconnexion',
    'settings.deleteAccount': 'Supprimer le compte',
    'settings.deleteQuestion': 'Voulez-vous vraiment supprimer votre compte ? Cette action est definitive.',
    'settings.cancel': 'Annuler',
    'toast.preferencesSaved': 'Preferences enregistrees',
    'toast.preferencesSavedDescription': 'Vos preferences sont conservees pour cet espace.',
    'toast.profileSaved': 'Profil enregistre',
    'toast.profileSavedDescription': 'Votre profil a ete mis a jour avec succes.',
    'toast.profileFailed': 'Echec de la mise a jour',
    'toast.profileFailedDescription': 'Verifiez le nom affiche et l email, puis reessayez.',
    'toast.languageUpdated': 'Langue mise a jour',
    'toast.timezoneUpdated': 'Fuseau horaire mis a jour',
    'nav.dashboard': 'Tableau de bord',
    'nav.users': 'Utilisateurs',
    'nav.teams': 'Equipes',
    'nav.projects': 'Projets',
    'nav.repositories': 'Depots',
    'nav.documents': 'Documents',
    'nav.documentation': 'Documentation',
    'nav.analyses': 'Analyses',
    'nav.reviews': 'Revues',
    'nav.todos': 'Taches',
    'nav.conversations': 'Conversations',
    'nav.assistant': 'Assistant',
    'nav.settings': 'Parametres',
    'nav.audit': 'Audit',
    'nav.systemHealth': 'Etat systeme',
    'nav.reports': 'Rapports',
    'nav.sprint': 'Sprint',
    'nav.architecture': 'Architecture',
    'nav.dependencies': 'Dependances',
    'nav.impact': 'Impact',
    'nav.quality': 'Qualite',
    'nav.security': 'Securite',
    'nav.myTodos': 'Mes taches'
  }
} as const;

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function resolveInitialLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === 'fr' || stored === 'French' ? 'fr' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(resolveInitialLanguage);

  const changeLanguage = (nextLanguage: Language) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    setLanguage(nextLanguage);
  };

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage: changeLanguage,
    t: (key: string) => {
      const dictionary = translations[language] as Record<string, string>;
      const fallback = translations.en as Record<string, string>;
      return dictionary[key] ?? fallback[key] ?? key;
    }
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }

  return context;
}
