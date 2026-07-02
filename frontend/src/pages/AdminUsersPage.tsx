import { useEffect, useState } from 'react';
import { Filter, ShieldPlus, SlidersHorizontal, Users2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CreateUserModal } from '../components/admin/CreateUserModal';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
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
import { getApiErrorMessage } from '../lib/api';
import { adminUserService } from '../services/adminUserService';
import type { AdminUserListFilters, AdminUserStatusFilter, CreateAdminUserPayload } from '../types/admin';
import type { Role, UpdateUserPayload, User } from '../types/user';

const roleOptions: Array<Role | ''> = ['', 'ADMIN', 'MANAGER', 'ARCHITECT', 'QA', 'DEVELOPER'];
const statusOptions: AdminUserStatusFilter[] = ['', 'ACTIVE', 'DISABLED', 'LOCKED'];

const defaultFilters: AdminUserListFilters = {
  search: '',
  role: '',
  status: '',
  page: 0,
  size: 10,
  sortBy: 'createdAt',
  sortDirection: 'desc'
};

export function AdminUsersPage() {
  const navigate = useNavigate();
  const { currentUser, refreshSession } = useSession();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<AdminUserListFilters>(defaultFilters);
  const [userPage, setUserPage] = useState<Awaited<ReturnType<typeof adminUserService.getUsers>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(filters.search);

  const loadUsers = async () => {
    setLoading(true);

    try {
      const response = await adminUserService.getUsers({
        ...filters,
        search: debouncedSearch
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
  }, [debouncedSearch, filters.page, filters.role, filters.size, filters.sortBy, filters.sortDirection, filters.status]);

  const handleSort = (field: string) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      sortBy: field,
      sortDirection:
        currentFilters.sortBy === field && currentFilters.sortDirection === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCreateSubmit = async (payload: CreateAdminUserPayload) => {
    setSubmitting(true);

    try {
      await adminUserService.createUser({
        ...payload,
        enabled: true
      });
      showToast({
        type: 'success',
        title: 'User created',
        description: `${payload.firstName} ${payload.lastName} was added successfully.`
      });
      setCreateOpen(false);
      await loadUsers();
    } catch (createError) {
      showToast({
        type: 'error',
        title: 'Unable to create user',
        description: getApiErrorMessage(createError)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (payload: UpdateUserPayload) => {
    if (!selectedUser) {
      return;
    }

    setSubmitting(true);

    try {
      await adminUserService.updateUser(selectedUser.id, payload);
      showToast({
        type: 'success',
        title: 'User updated',
        description: `${selectedUser.firstName} ${selectedUser.lastName} was updated successfully.`
      });
      setEditOpen(false);
      await loadUsers();

      if (currentUser?.id === selectedUser.id) {
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
      await adminUserService.deleteUser(selectedUser.id);
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
  const lockedOrDisabledCount =
    userPage?.content.filter((user) => !user.enabled || user.accountLocked).length ?? 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Visible users</p>
          <p className="mt-4 text-4xl font-semibold text-white">{userPage?.totalElements ?? 0}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Active accounts</p>
          <p className="mt-4 text-4xl font-semibold text-white">{activeCount}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Administrators</p>
          <p className="mt-4 text-4xl font-semibold text-white">{adminCount}</p>
        </div>
        <div className="page-shell border-white/10 bg-slate-950/60">
          <p className="text-sm text-slate-400">Needs attention</p>
          <p className="mt-4 text-4xl font-semibold text-white">{lockedOrDisabledCount}</p>
        </div>
      </section>

      <section className="page-shell space-y-5 border-white/10 bg-slate-950/60">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">User directory</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Complete User Management</h3>
            <p className="mt-2 text-sm text-slate-400">Search, filter, provision, and govern platform access from one place.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-100">
              <Users2 className="h-4 w-4" />
              {userPage?.totalElements ?? 0} users matched
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-brand-400 hover:to-indigo-400"
              onClick={() => setCreateOpen(true)}
              type="button"
            >
              <ShieldPlus className="h-4 w-4" />
              Create User
            </button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_180px_170px]">
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

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <Filter className="h-4 w-4 text-brand-300" />
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
                <option className="bg-slate-950 text-white" key={roleOption || 'all-roles'} value={roleOption}>
                  {roleOption || 'All roles'}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <SlidersHorizontal className="h-4 w-4 text-brand-300" />
            <select
              className="w-full bg-transparent outline-none"
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  status: event.target.value as AdminUserStatusFilter,
                  page: 0
                }))
              }
              value={filters.status}
            >
              {statusOptions.map((statusOption) => (
                <option className="bg-slate-950 text-white" key={statusOption || 'all-statuses'} value={statusOption}>
                  {statusOption ? statusOption.charAt(0) + statusOption.slice(1).toLowerCase() : 'All statuses'}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <SlidersHorizontal className="h-4 w-4 text-brand-300" />
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
                <option className="bg-slate-950 text-white" key={sizeOption} value={sizeOption}>
                  {sizeOption} per page
                </option>
              ))}
            </select>
          </label>

          <button
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-brand-400/30 hover:text-brand-200"
            onClick={() => setFilters(defaultFilters)}
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
          description="Try adjusting your search, role, or account-status filters to surface matching users."
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
              onView={(user) => navigate(`/dashboard/users/${user.id}`)}
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
                onView={() => navigate(`/dashboard/users/${user.id}`)}
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

      <CreateUserModal
        loading={submitting}
        onClose={() => setCreateOpen(false)}
        onSubmit={(payload) => {
          void handleCreateSubmit(payload);
        }}
        open={createOpen}
      />

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
