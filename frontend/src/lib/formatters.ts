import type { Role, User } from '../types/user';
import { formatRoleLabel } from './workspace';

export function formatRole(role: Role) {
  return formatRoleLabel(role);
}

export function formatDate(value: string) {
  if (!value) {
    return 'Not available';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(parsedDate);
}

export function getInitials(user: User) {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}
