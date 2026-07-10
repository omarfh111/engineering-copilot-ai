import {
  Activity,
  Bot,
  Boxes,
  ClipboardCheck,
  MessageSquareText,
  FileText,
  FolderKanban,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  ShieldCheck,
  ShieldEllipsis,
  Spline,
  SquareCheckBig,
  TimerReset,
  Users,
  UsersRound,
  Waypoints,
  Wrench
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '../types/user';

export type WorkspaceModuleId =
  | 'dashboard'
  | 'users'
  | 'teams'
  | 'projects'
  | 'repositories'
  | 'documents'
  | 'analyses'
  | 'reviews'
  | 'todos'
  | 'conversations'
  | 'settings'
  | 'audit'
  | 'system-health'
  | 'reports'
  | 'sprint'
  | 'architecture'
  | 'dependencies'
  | 'documentation'
  | 'impact'
  | 'quality'
  | 'security'
  | 'assistant'
  | 'my-todos';

export interface WorkspaceRoleDefinition {
  label: string;
  workspaceName: string;
  dashboardHeadline: string;
  dashboardDescription: string;
  accessSummary: string;
}

export interface WorkspaceModuleDefinition {
  id: WorkspaceModuleId;
  label: string;
  path: string;
  icon: LucideIcon;
  allowedRoles: Role[];
  kicker: string;
  headline: string;
  description: string;
  capabilities: Partial<Record<Role, string[]>>;
  boundaries: string[];
}

export const roleDefinitions: Record<Role, WorkspaceRoleDefinition> = {
  ADMIN: {
    label: 'Administrator',
    workspaceName: 'Platform Command',
    dashboardHeadline: 'Platform governance, access control, and system oversight.',
    dashboardDescription:
      'Supervise users, teams, repositories, and operational telemetry across the full Engineering Copilot platform.',
    accessSummary: 'Full enterprise governance with audit and platform visibility.'
  },
  MANAGER: {
    label: 'Manager',
    workspaceName: 'Delivery Control',
    dashboardHeadline: 'Project delivery, sprint health, and engineering throughput.',
    dashboardDescription:
      'Coordinate projects, repositories, teams, TODO ownership, and release progress across the delivery organization.',
    accessSummary: 'Portfolio execution and team coordination without platform administration.'
  },
  ARCHITECT: {
    label: 'Architect',
    workspaceName: 'Architecture Desk',
    dashboardHeadline: 'Technical design, dependency intelligence, and impact planning.',
    dashboardDescription:
      'Review architecture signals, documentation coverage, repository structure, and downstream change impact.',
    accessSummary: 'Architecture governance with deep repository and documentation insight.'
  },
  QA: {
    label: 'QA',
    workspaceName: 'Quality Gate',
    dashboardHeadline: 'Quality controls, security findings, and review readiness.',
    dashboardDescription:
      'Track reviews, security posture, validation work, and remediation queues before releases move forward.',
    accessSummary: 'Quality and security oversight without project or platform administration.'
  },
  DEVELOPER: {
    label: 'Developer',
    workspaceName: 'Builder Workspace',
    dashboardHeadline: 'Execution, documentation, and delivery follow-through.',
    dashboardDescription:
      'Focus on active projects, repository context, documentation, and personal TODO execution.',
    accessSummary: 'Hands-on engineering workspace with personal execution focus.'
  },
  AUDITOR: {
    label: 'Auditor',
    workspaceName: 'Audit Review',
    dashboardHeadline: 'Read-only review of documents, documentation, analyses, and review decisions.',
    dashboardDescription:
      'Inspect evidence, analysis outcomes, documentation records, and QA review history without changing platform data.',
    accessSummary: 'Read-only governance visibility for evidence and quality review artifacts.'
  }
};

export const workspaceModules: Record<WorkspaceModuleId, WorkspaceModuleDefinition> = {
  dashboard: {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    allowedRoles: ['ADMIN', 'MANAGER', 'ARCHITECT', 'QA', 'DEVELOPER', 'AUDITOR'],
    kicker: 'Operations center',
    headline: 'Role-specific command center',
    description: 'Monitor the engineering signals, risks, and delivery metrics that matter to your responsibility.',
    capabilities: {},
    boundaries: ['Dashboard access is tailored to the connected role and only surfaces relevant enterprise signals.']
  },
  users: {
    id: 'users',
    label: 'Users',
    path: '/dashboard/users',
    icon: Users,
    allowedRoles: ['ADMIN'],
    kicker: 'Identity governance',
    headline: 'Manage enterprise access',
    description: 'Provision accounts, assign roles, and control the identity layer of the engineering platform.',
    capabilities: {
      ADMIN: ['Create users', 'Edit every user', 'Assign roles', 'Lock or unlock accounts', 'Enable or disable accounts']
    },
    boundaries: ['Administrative access only.', 'This module is never exposed to delivery, architecture, QA, or developer roles.']
  },
  teams: {
    id: 'teams',
    label: 'Teams',
    path: '/dashboard/teams',
    icon: UsersRound,
    allowedRoles: ['ADMIN'],
    kicker: 'Organization structure',
    headline: 'Coordinate team ownership',
    description: 'Create engineering teams, define their mission, and manage user membership before projects are assigned.',
    capabilities: {
      ADMIN: ['Create teams', 'Edit teams', 'Delete teams', 'Assign users to teams', 'Review team capacity']
    },
    boundaries: ['Team management is reserved for platform administrators during Sprint 2 foundation work.']
  },
  projects: {
    id: 'projects',
    label: 'Projects',
    path: '/dashboard/projects',
    icon: FolderKanban,
    allowedRoles: ['ADMIN', 'MANAGER', 'ARCHITECT', 'QA', 'DEVELOPER', 'AUDITOR'],
    kicker: 'Delivery portfolio',
    headline: 'Track delivery initiatives',
    description: 'Keep projects aligned across delivery, repository inventory, quality gates, and analysis activity.',
    capabilities: {
      ADMIN: ['Monitor every project', 'Audit project activity across teams'],
      MANAGER: ['Create projects', 'Assign repositories and people', 'Approve milestones', 'Monitor progress'],
      ARCHITECT: ['Review technical scope', 'Assess architectural impact across initiatives'],
      QA: ['Validate release readiness', 'Track defect pressure by project'],
      DEVELOPER: ['Follow assigned project context', 'Review implementation and repository signals']
    },
    boundaries: ['Project visibility is broad, but only administrators and managers can govern project ownership.']
  },
  repositories: {
    id: 'repositories',
    label: 'Repositories',
    path: '/dashboard/repositories',
    icon: GitBranch,
    allowedRoles: ['ADMIN', 'MANAGER', 'ARCHITECT', 'QA', 'DEVELOPER'],
    kicker: 'Source control inventory',
    headline: 'Manage linked repositories',
    description: 'Track repository metadata, providers, default branches, and project ownership during Sprint 2 CRUD delivery.',
    capabilities: {
      ADMIN: ['Create repositories', 'Edit repository metadata', 'Delete repository links', 'Review platform inventory'],
      MANAGER: ['View repository assignments', 'Track repository coverage for delivery'],
      ARCHITECT: ['Review repository inventory', 'Inspect provider and technology metadata'],
      QA: ['View repository inventory linked to accessible projects'],
      DEVELOPER: ['View repository inventory linked to accessible projects']
    },
    boundaries: ['Repository work is metadata CRUD only and does not include provider sync or cloning.']
  },
  documents: {
    id: 'documents',
    label: 'Documents',
    path: '/dashboard/documents',
    icon: FileText,
    allowedRoles: ['ADMIN', 'MANAGER', 'ARCHITECT', 'QA', 'DEVELOPER', 'AUDITOR'],
    kicker: 'Reference inventory',
    headline: 'Manage linked source documents',
    description: 'Track standards, internal norms, architecture references, and technical guidance as project-linked metadata during Sprint 2 CRUD delivery.',
    capabilities: {
      ADMIN: ['Create documents', 'Edit document metadata', 'Delete document links', 'Review platform inventory'],
      MANAGER: ['View documents linked to accessible projects', 'Track reference coverage for delivery'],
      ARCHITECT: ['Review architecture and standards references linked to projects'],
      QA: ['View security and quality reference documents linked to accessible projects'],
      DEVELOPER: ['View source documents linked to accessible projects']
    },
    boundaries: ['Document work is metadata CRUD with preview and download links when files are served by the backend.']
  },
  analyses: {
    id: 'analyses',
    label: 'Analyses',
    path: '/dashboard/analyses',
    icon: Boxes,
    allowedRoles: ['ADMIN', 'MANAGER', 'QA', 'AUDITOR'],
    kicker: 'Analysis center',
    headline: 'Audit analysis operations',
    description: 'Track analysis volume, outcomes, and enterprise-wide scan history for governance purposes.',
    capabilities: {
      ADMIN: ['View every analysis', 'Inspect operational scan history', 'Track platform-wide activity'],
      MANAGER: ['View analyses linked to managed delivery work', 'Track project risk signals'],
      QA: ['Create analyses', 'Update analysis outcomes', 'Track quality and security findings'],
      AUDITOR: ['Read analysis evidence', 'Inspect status and severity history']
    },
    boundaries: ['Auditors can read analyses but cannot create, edit, or delete them.']
  },
  reviews: {
    id: 'reviews',
    label: 'Reviews',
    path: '/dashboard/reviews',
    icon: ClipboardCheck,
    allowedRoles: ['ADMIN', 'MANAGER', 'QA', 'AUDITOR'],
    kicker: 'Decision workflows',
    headline: 'Track review decisions',
    description: 'Follow approval flow, pending reviews, and release-quality checkpoints across engineering work.',
    capabilities: {
      ADMIN: ['View every review', 'Audit approval history'],
      MANAGER: ['Monitor review progress', 'Support milestone approvals'],
      QA: ['Review code', 'Approve QA checks', 'Validate release readiness'],
      AUDITOR: ['Read review decisions', 'Inspect QA evidence without editing']
    },
    boundaries: ['Auditors can read reviews but cannot create, edit, or delete review decisions.']
  },
  todos: {
    id: 'todos',
    label: 'Todos',
    path: '/dashboard/todos',
    icon: SquareCheckBig,
    allowedRoles: ['ADMIN', 'MANAGER', 'QA', 'DEVELOPER'],
    kicker: 'Execution backlog',
    headline: 'Manage operational TODO flow',
    description: 'Observe remediation queues, QA work items, and enterprise follow-ups produced by analyses and reviews.',
    capabilities: {
      ADMIN: ['View every TODO', 'Audit remediation backlog platform-wide'],
      MANAGER: ['Assign TODOs', 'Change priorities', 'Monitor completion risk'],
      QA: ['Manage QA TODOs', 'Validate defect remediation flow'],
      DEVELOPER: ['Update assigned project TODO status', 'Track active remediation work']
    },
    boundaries: ['Auditors do not receive TODO access. Developers can work TODOs visible through assigned project membership.']
  },
  conversations: {
    id: 'conversations',
    label: 'Conversations',
    path: '/dashboard/conversations',
    icon: MessageSquareText,
    allowedRoles: ['ADMIN', 'MANAGER', 'DEVELOPER'],
    kicker: 'Assistant history',
    headline: 'Review project conversations',
    description: 'Inspect project-linked questions, answers, confidence scores, and response latency.',
    capabilities: {
      ADMIN: ['View every conversation', 'Edit or remove exchange records'],
      MANAGER: ['Read project conversation history', 'Track support activity'],
      DEVELOPER: ['Create conversations', 'Edit own exchanges', 'Review project context']
    },
    boundaries: ['Conversation writes are limited to administrators and developers.']
  },
  settings: {
    id: 'settings',
    label: 'Settings',
    path: '/dashboard/settings',
    icon: Wrench,
    allowedRoles: ['ADMIN'],
    kicker: 'Platform controls',
    headline: 'Configure enterprise settings',
    description: 'Adjust administrator-facing platform settings, governance defaults, and operational guardrails.',
    capabilities: {
      ADMIN: ['Manage platform settings', 'Review workspace governance defaults']
    },
    boundaries: ['Platform settings are reserved for administrators.']
  },
  audit: {
    id: 'audit',
    label: 'Audit',
    path: '/dashboard/audit',
    icon: ShieldEllipsis,
    allowedRoles: ['ADMIN'],
    kicker: 'Traceability',
    headline: 'Inspect audit history',
    description: 'Review historical access, administration, and operational traces across the engineering platform.',
    capabilities: {
      ADMIN: ['View audit history', 'Inspect platform activity trails']
    },
    boundaries: ['Audit history is intentionally unavailable outside the administrator workspace.']
  },
  'system-health': {
    id: 'system-health',
    label: 'System Health',
    path: '/dashboard/system-health',
    icon: HeartPulse,
    allowedRoles: ['ADMIN'],
    kicker: 'Operational resilience',
    headline: 'Monitor service health',
    description: 'Track platform stability, service readiness, and operational signals behind the engineering workspace.',
    capabilities: {
      ADMIN: ['Monitor system health', 'Review cross-service readiness']
    },
    boundaries: ['Infrastructure health visibility is reserved for platform administrators.']
  },
  reports: {
    id: 'reports',
    label: 'Reports',
    path: '/dashboard/reports',
    icon: Activity,
    allowedRoles: ['MANAGER'],
    kicker: 'Portfolio reporting',
    headline: 'Review delivery reporting',
    description: 'Surface project analytics, workload pressure, and delivery reporting for the engineering organization.',
    capabilities: {
      MANAGER: ['View project analytics', 'Review reports', 'Track delivery performance']
    },
    boundaries: ['Reporting here is focused on delivery management rather than system governance or code-level execution.']
  },
  sprint: {
    id: 'sprint',
    label: 'Sprint',
    path: '/dashboard/sprint',
    icon: TimerReset,
    allowedRoles: ['MANAGER'],
    kicker: 'Sprint operations',
    headline: 'Guide sprint execution',
    description: 'Coordinate sprint progress, blockers, and capacity decisions for active delivery cycles.',
    capabilities: {
      MANAGER: ['Monitor sprint progress', 'Rebalance work', 'Escalate blockers']
    },
    boundaries: ['Sprint governance remains a management workflow and is not exposed to other roles.']
  },
  architecture: {
    id: 'architecture',
    label: 'Architecture',
    path: '/dashboard/architecture',
    icon: Spline,
    allowedRoles: ['ARCHITECT'],
    kicker: 'Design authority',
    headline: 'Review architecture posture',
    description: 'Inspect architecture reviews, system topology concerns, and technical design direction across repositories.',
    capabilities: {
      ARCHITECT: ['Analyze repository architecture', 'Review technical design', 'Generate diagrams and documentation']
    },
    boundaries: ['Architecture approval workflows stay in the architect workspace and are not delegated elsewhere.']
  },
  dependencies: {
    id: 'dependencies',
    label: 'Dependencies',
    path: '/dashboard/dependencies',
    icon: Waypoints,
    allowedRoles: ['ARCHITECT'],
    kicker: 'Dependency intelligence',
    headline: 'Understand dependency risk',
    description: 'Explore dependency signals, coupling risk, and change propagation concerns before architectural decisions land.',
    capabilities: {
      ARCHITECT: ['Inspect dependency graph', 'Flag risky coupling', 'Review cross-repository impact']
    },
    boundaries: ['Dependency governance in this space is owned by architecture rather than QA or delivery management.']
  },
  documentation: {
    id: 'documentation',
    label: 'Documentation',
    path: '/dashboard/documentation',
    icon: FileText,
    allowedRoles: ['ADMIN', 'MANAGER', 'ARCHITECT', 'QA', 'DEVELOPER', 'AUDITOR'],
    kicker: 'Delivery knowledge',
    headline: 'Manage documentation deliverables',
    description: 'Track README files, API guides, architecture notes, onboarding assets, and technical reports linked to projects.',
    capabilities: {
      ADMIN: ['Create documentation', 'Edit every documentation record', 'Delete documentation deliverables', 'Review platform coverage'],
      MANAGER: ['View documentation linked to accessible projects', 'Track delivery knowledge coverage'],
      ARCHITECT: ['Create documentation deliverables', 'Edit accessible project documentation', 'Maintain architecture knowledge'],
      QA: ['Review documentation readiness linked to accessible projects'],
      DEVELOPER: ['Read project documentation deliverables'],
      AUDITOR: ['Read documentation deliverables', 'Inspect evidence without editing']
    },
    boundaries: ['This module is CRUD only for now and does not implement generated content or indexing workflows.']
  },
  impact: {
    id: 'impact',
    label: 'Impact',
    path: '/dashboard/impact',
    icon: Bot,
    allowedRoles: ['ARCHITECT'],
    kicker: 'Change planning',
    headline: 'Forecast change impact',
    description: 'Estimate architectural impact, downstream repository effects, and design-risk concentration before implementation.',
    capabilities: {
      ARCHITECT: ['Run impact analysis', 'Assess downstream change risk', 'Prepare technical design guidance']
    },
    boundaries: ['Impact governance is an architectural responsibility, not a QA or administrative workflow.']
  },
  quality: {
    id: 'quality',
    label: 'Quality',
    path: '/dashboard/quality',
    icon: ShieldCheck,
    allowedRoles: ['QA'],
    kicker: 'Quality assurance',
    headline: 'Track quality signals',
    description: 'Inspect quality findings, validation trends, and release-blocking risks before software moves forward.',
    capabilities: {
      QA: ['Run quality analysis', 'Approve QA checks', 'View quality reports']
    },
    boundaries: ['Quality gates remain within QA stewardship and are not exposed as approval tools for other roles.']
  },
  security: {
    id: 'security',
    label: 'Security',
    path: '/dashboard/security',
    icon: ShieldEllipsis,
    allowedRoles: ['QA'],
    kicker: 'Security assurance',
    headline: 'Review security posture',
    description: 'Follow security findings, remediation pressure, and release validation signals across active work.',
    capabilities: {
      QA: ['Run security analysis', 'Validate release security posture', 'Track open findings']
    },
    boundaries: ['Security review in this workspace is a QA responsibility and cannot be used for platform administration.']
  },
  assistant: {
    id: 'assistant',
    label: 'Assistant',
    path: '/dashboard/assistant',
    icon: Bot,
    allowedRoles: ['DEVELOPER'],
    kicker: 'Developer support',
    headline: 'Work with project support',
    description: 'Use saved project context for repository questions, implementation notes, and documentation support.',
    capabilities: {
      DEVELOPER: ['Ask project questions', 'Draft documentation notes', 'Review engineering recommendations']
    },
    boundaries: ['Assistant workflows here support hands-on delivery work and do not grant approval authority.']
  },
  'my-todos': {
    id: 'my-todos',
    label: 'My Todos',
    path: '/dashboard/my-todos',
    icon: SquareCheckBig,
    allowedRoles: ['DEVELOPER'],
    kicker: 'Personal execution',
    headline: 'Work your assigned TODOs',
    description: 'Focus on the remediation and execution items relevant to your current engineering work.',
    capabilities: {
      DEVELOPER: ['View assigned TODOs', 'Track active execution work', 'Consult project recommendations']
    },
    boundaries: ['Developers receive a focused execution list instead of the platform-wide operational backlog.']
  }
};

export const roleNavigationOrder: Record<Role, WorkspaceModuleId[]> = {
  ADMIN: [
    'dashboard',
    'users',
    'teams',
    'projects',
    'repositories',
    'documents',
    'documentation',
    'analyses',
    'reviews',
    'todos',
    'settings',
    'audit',
    'system-health'
  ],
  MANAGER: ['dashboard', 'projects', 'repositories', 'documents', 'documentation', 'analyses', 'todos', 'reviews', 'conversations', 'reports', 'sprint'],
  ARCHITECT: ['dashboard', 'projects', 'repositories', 'documents', 'documentation', 'architecture', 'dependencies', 'impact'],
  QA: ['dashboard', 'projects', 'documents', 'documentation', 'analyses', 'quality', 'security', 'reviews', 'todos'],
  DEVELOPER: ['dashboard', 'projects', 'repositories', 'documents', 'documentation', 'todos', 'conversations', 'assistant', 'my-todos'],
  AUDITOR: ['dashboard', 'documents', 'documentation', 'analyses', 'reviews']
};

export function formatRoleLabel(role: Role) {
  return roleDefinitions[role].label;
}

export function getNavigationModules(role: Role) {
  return roleNavigationOrder[role]
    .map((moduleId) => workspaceModules[moduleId])
    .filter((module) => module.allowedRoles.includes(role));
}

export function canAccessModule(role: Role, moduleId: WorkspaceModuleId) {
  return workspaceModules[moduleId].allowedRoles.includes(role);
}

export function resolvePageTitle(pathname: string) {
  if (pathname.startsWith('/dashboard/users/')) {
    return 'User Details';
  }

  if (pathname.startsWith('/dashboard/teams/')) {
    return 'Team Details';
  }

  if (pathname.startsWith('/dashboard/projects/')) {
    return 'Project Details';
  }

  if (pathname === '/settings/profile') {
    return 'My Profile';
  }

  if (pathname === '/settings/profile/edit') {
    return 'Edit Profile';
  }

  const moduleEntry = Object.values(workspaceModules).find((module) => module.path === pathname);
  return moduleEntry?.label ?? 'Engineering Copilot';
}
