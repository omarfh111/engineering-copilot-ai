import type { RepositoryProvider } from '../types/repository';

export const repositoryProviderOptions: RepositoryProvider[] = ['GITHUB', 'GITLAB', 'BITBUCKET', 'OTHER'];

const repositoryProviderLabels: Record<RepositoryProvider, string> = {
  GITHUB: 'GitHub',
  GITLAB: 'GitLab',
  BITBUCKET: 'Bitbucket',
  OTHER: 'Other'
};

export function formatRepositoryProvider(provider: RepositoryProvider) {
  return repositoryProviderLabels[provider];
}
