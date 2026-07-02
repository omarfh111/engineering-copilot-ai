import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, SlidersHorizontal, Users } from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import { SearchBar } from '../components/common/SearchBar';
import { DeleteConfirmationDialog } from '../components/user/DeleteConfirmationDialog';
import { EditUserModal } from '../components/user/EditUserModal';
import { UserCard } from '../components/user/UserCard';
import { UserTable } from '../components/user/UserTable';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { getApiErrorMessage, userApi } from '../lib/api';
import type { PagedResponse, Role, UpdateUserPayload, User } from '../types/user';

const roleOptions: Array<Role | ''> = ['', 'ADMIN', 'MANAGER', 'ARCHITECT', 'QA', 'DEVELOPER'];

export function UserListPage() {
  const navigate = useNavigate();
  const { currentUser, refreshSession } = useSession();
  const { showToast } = useToast();
  const [filters, setFilters] = useState({
    search: '',
    role: '' as Role | '',
    page: 0,
    size: 10,
    sortBy: 'createdAt',
    sortDirection: 'desc' as 'asc' | 'desc'
  });
  const [userPage, setUserPage] = useState<PagedResponse<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(filters.search);

  const loadUsers = async () => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await userApi.getUsers({
        search: debouncedSearch,
        role: filters.role,
        page: filters.page,
        size: filters.size,
        sortBy: filters.sortBy,
        sortDirection: filters.sortDirection
      });

      setUserPage(response);
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [currentUser, debouncedSearch, filters.page, filters.role, filters.size, filters.sortBy, filters.sortDirection]);

  if (!currentUser) {
    return null;
  }

  if (currentUser.role !== 'ADMIN') {
    return (
      <ErrorState
        description="Only administrators can browse and manage all user accounts."
        title="Admin access required"
      />
    );
  }

  const handleSort = (field: string) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      sortBy: field,
      sortDirection:
        currentFilters.sortBy === field && currentFilters.sortDirection === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleEditSubmit = async (payload: UpdateUserPayload) => {
    if (!selectedUser) {
      return;
    }

    setSubmitting(true);

    try {
      await userApi.updateUser(selectedUser.id, payload);
      showToast({
        type: 'success',
        title: 'User updated',
        description: `${selectedUser.firstName} ${selectedUser.lastName} was updated successfully.`
      });
      setEditOpen(false);
      await loadUsers();

      if (currentUser.id === selectedUser.id) {
        await refreshSession();
      }
    } catch (updateError) {
      showToast({
        type: 'error',
        title: 'Update failed',
        description: getApiErrorMessage(updateError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) {
      return;
    }

    setSubmitting(true);

    try {
      await userApi.deleteUser(selectedUser.id);
      showToast({
        type: 'success',
        title: 'User deleted',
        description: `${selectedUser.firstName} ${selectedUser.lastName} has been removed.`
      });
      setDeleteOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (deleteError) {
      showToast({
        type: 'error',
        title: 'Delete failed',
        description: getApiErrorMessage(deleteError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = userPage?.content.filter((user) => user.enabled && !user.accountLocked).length ?? 0;
  const adminCount = userPage?.content.filter((user) => user.role === 'ADMIN').length ?? 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="page-shell">
          <p className="text-sm text-slate-500 dark:text-slate-400">Visible users</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900 dark:text-white">{userPage?.totalElements ?? 0}</p>
        </div>
        <div className="page-shell">
          <p className="text-sm text-slate-500 dark:text-slate-400">Active on this page</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900 dark:text-white">{activeCount}</p>
        </div>
        <div className="page-shell">
          <p className="text-sm text-slate-500 dark:text-slate-400">Admins on this page</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900 dark:text-white">{adminCount}</p>
        </div>
      </section>

      <section className="page-shell space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-300">
              User directory
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Manage platform users</h3>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
            <Users className="h-4 w-4" />
            {userPage?.totalElements ?? 0} total users
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_180px]">
          <SearchBar
            onChange={(value) =>
              setFilters((currentFilters) => ({
                ...currentFilters,
                search: value,
                page: 0
              }))
            }
            value={filters.search}
          />

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
            <Filter className="h-4 w-4 text-brand-500" />
            <select
              className="w-full bg-transparent outline-none"
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  role: event.target.value as Role | '',
                  page: 0
                }))
              }
              value={filters.role}
            >
              {roleOptions.map((roleOption) => (
                <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white" key={roleOption || 'all'} value={roleOption}>
                  {roleOption || 'All roles'}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
            <SlidersHorizontal className="h-4 w-4 text-brand-500" />
            <select
              className="w-full bg-transparent outline-none"
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  size: Number(event.target.value),
                  page: 0
                }))
              }
              value={filters.size}
            >
              {[10, 20, 50].map((sizeOption) => (
                <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white" key={sizeOption} value={sizeOption}>
                  {sizeOption} per page
                </option>
              ))}
            </select>
          </label>

          <button
            className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
            onClick={() => {
              setFilters({
                search: '',
                role: '',
                page: 0,
                size: 10,
                sortBy: 'createdAt',
                sortDirection: 'desc'
              });
            }}
            type="button"
          >
            Reset filters
          </button>
        </div>
      </section>

      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-24 w-full" />
          <LoadingSkeleton className="h-72 w-full" />
        </div>
      ) : error ? (
        <ErrorState
          actionLabel="Reload users"
          description={error}
          onAction={() => {
            void loadUsers();
          }}
          title="Unable to load users"
        />
      ) : !userPage || userPage.content.length === 0 ? (
        <EmptyState
          description="Try adjusting your search, role filter, or page size to surface matching users."
          title="No users found"
        />
      ) : (
        <>
          <div className="hidden xl:block">
            <UserTable
              onDelete={(user) => {
                setSelectedUser(user);
                setDeleteOpen(true);
              }}
              onEdit={(user) => {
                setSelectedUser(user);
                setEditOpen(true);
              }}
              onSort={handleSort}
              onView={(user) => navigate(`/users/${user.id}`)}
              sortBy={filters.sortBy}
              sortDirection={filters.sortDirection}
              users={userPage.content}
            />
          </div>

          <div className="grid gap-4 xl:hidden">
            {userPage.content.map((user) => (
              <UserCard
                key={user.id}
                onDelete={() => {
                  setSelectedUser(user);
                  setDeleteOpen(true);
                }}
                onEdit={() => {
                  setSelectedUser(user);
                  setEditOpen(true);
                }}
                onView={() => navigate(`/users/${user.id}`)}
                user={user}
              />
            ))}
          </div>

          <Pagination
            currentPage={userPage.page}
            onPageChange={(page) => setFilters((currentFilters) => ({ ...currentFilters, page }))}
            totalPages={userPage.totalPages}
          />
        </>
      )}

      <EditUserModal
        isAdmin
        loading={submitting}
        onClose={() => {
          setEditOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={(payload) => {
          void handleEditSubmit(payload);
        }}
        open={editOpen}
        user={selectedUser}
      />

      <DeleteConfirmationDialog
        loading={submitting}
        onCancel={() => {
          setDeleteOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
        open={deleteOpen}
        user={selectedUser}
      />
    </div>
  );
}
