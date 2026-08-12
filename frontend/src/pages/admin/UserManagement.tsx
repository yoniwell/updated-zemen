import { Plus, RefreshCcw, Search, Pencil, Trash2, KeyRound, ShieldAlert } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminApi';
import { toastApiError } from '@/lib/apiToast';
import { ROLE_LABELS, roleRequiresBranch, type AdminRole, ADMIN_ROLE_VALUES } from '@/lib/adminRbac';
import { getAdminUser } from '@/lib/adminAuth';
import { Button } from '@/components/ui/button';

import StatusBadge from '@/components/admin/StatusBadge';
import RoleChip from '@/components/admin/RoleChip';
import ConfirmDeleteModal from '@/components/admin/ConfirmDeleteModal';
import { formatDateTime as formatLocaleDateTime } from '@/lib/locale';
import { useAdminI18n } from '@/lib/uiI18n';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  branchId: string | null;
  branch: Branch | null;
  isActive: boolean;

  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RoleImpactPreview {
  impacts?: Array<{ level: 'info' | 'warning' | 'error'; code: string; message: string }>;
  canSave?: boolean;
  role?: string;
  added?: string[];
  removed?: string[];
  unchanged?: string[];
}

interface RoleAccess {
  role: AdminRole;
  label: string;
  modules: string[];
  branchRequired: boolean;
}

interface UserFormState {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  branchId: string;
  isActive: boolean;
}

const defaultCreateState: UserFormState = {
  name: '',
  email: '',
  password: '',
  role: 'OFFICER',
  branchId: '',
  isActive: true,
};

const formatDateTime = (value: string | null, fallback: string): string => {
  if (!value) {
    return fallback;
  }
  return formatLocaleDateTime(value);
};

const toStatusLabel = (isActive: boolean): 'Active' | 'Inactive' => (isActive ? 'Active' : 'Inactive');

export default function UserManagement() {
  const { tAdmin } = useAdminI18n();
  const user = getAdminUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [ ,setRoleAccess] = useState<RoleAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | AdminRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [branchFilter, setBranchFilter] = useState<'ALL' | string>('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortBy] = useState<'createdAt' | 'name' | 'email' | 'role' | 'lastLogin'>('createdAt');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<UserFormState>(defaultCreateState);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<UserFormState>(defaultCreateState);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [roleImpactPreview, setRoleImpactPreview] = useState<RoleImpactPreview | null>(null);
  const [roleImpactLoading, setRoleImpactLoading] = useState(false);

  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);


  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);


  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const userParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });

      if (searchQuery.trim()) userParams.set('search', searchQuery.trim());
      if (roleFilter !== 'ALL') userParams.set('role', roleFilter);
      if (statusFilter === 'ACTIVE') userParams.set('isActive', 'true');
      if (statusFilter === 'INACTIVE') userParams.set('isActive', 'false');
      if (branchFilter && branchFilter !== 'ALL') userParams.set('branch', branchFilter);

      const [usersResponse, branchesResponse] = await Promise.all([
        adminFetch<{ users: AdminUser[]; total: number; page: number; limit: number }>(`/api/users?${userParams.toString()}`),
        adminFetch<{ branches: Branch[] }>('/api/settings/branches'),
      ]);

      setUsers(usersResponse.users);
      setTotal(usersResponse.total);
      setBranches(branchesResponse.branches);
      setRoleAccess([]);
    } catch (error) {
      toastApiError(error, tAdmin('failedToLoadUserManagementData', 'Failed to load user management data'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, searchQuery, roleFilter, statusFilter, branchFilter, tAdmin, setRoleAccess]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredUsers = useMemo(() => users, [users]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleCreateUser = async () => {
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) {
      toast.error(tAdmin('nameEmailPasswordRequired', 'Name, email, and password are required'));
      return;
    }

    if (roleRequiresBranch(createForm.role) && !createForm.branchId) {
      toast.error(tAdmin('selectedRoleRequiresBranch', 'Selected role requires a branch assignment'));
      return;
    }

    setCreateSubmitting(true);
    try {
      await adminFetch<{ user: AdminUser }>('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name.trim(),
          email: createForm.email.trim().toLowerCase(),
          password: createForm.password,
          role: createForm.role,
          branchId: createForm.branchId || null,
          isActive: createForm.isActive,
        }),
      });
      toast.success(tAdmin('userCreatedSuccessfully', 'User created successfully'));
      setIsCreateOpen(false);
      setCreateForm(defaultCreateState);
      await loadData();
    } catch (error) {
      toastApiError(error, tAdmin('failedToCreateUser', 'Failed to create user'));
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openEditDialog = (user: AdminUser) => {
    setEditingUser(user);
    setRoleImpactPreview(null);
    setEditForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      branchId: user.branchId || '',
      isActive: user.isActive,
    });
  };

  const loadRoleImpactPreview = useCallback(async (payload?: { role: AdminRole; branchId: string; isActive: boolean }) => {
    if (!editingUser) {
      return null;
    }

    const nextState = payload || editForm;

    setRoleImpactLoading(true);
    try {
      const response = await adminFetch<RoleImpactPreview>(`/api/users/${editingUser.id}/role-impact-preview`, {
        method: 'POST',
        body: JSON.stringify({
          role: nextState.role,
          branchId: nextState.branchId || null,
          isActive: nextState.isActive,
        }),
      });
      setRoleImpactPreview(response);
      return response;
    } catch (error) {
      toastApiError(error, tAdmin('failedToPreviewRoleImpact', 'Failed to preview role impact'));
      return null;
    } finally {
      setRoleImpactLoading(false);
    }
  }, [editingUser, editForm, tAdmin]);

  const handleUpdateUser = async () => {
    if (!editingUser) {
      return;
    }

    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error(tAdmin('nameEmailRequired', 'Name and email are required'));
      return;
    }

    if (roleRequiresBranch(editForm.role) && !editForm.branchId) {
      toast.error(tAdmin('selectedRoleRequiresBranch', 'Selected role requires a branch assignment'));
      return;
    }

    const preview = await loadRoleImpactPreview();
    if (preview && preview.canSave === false) {
      toast.error(tAdmin('resolveRoleImpactBlockers', 'Resolve role impact blockers before saving this user'));
      return;
    }

    setEditSubmitting(true);
    try {
      const response = await adminFetch<{ user: AdminUser }>(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editForm.name.trim(),
          email: editForm.email.trim().toLowerCase(),
          role: editForm.role,
          branchId: editForm.branchId || null,
          isActive: editForm.isActive,
        }),
      });
      toast.success(tAdmin('userUpdatedSuccessfully', 'User updated successfully'));
      const updatedBranch = branches.find(b => b.id === response.user.branchId) || null;
      setUsers(prev =>
        prev.map(u => (u.id === editingUser.id ? { ...u, ...response.user, branch: updatedBranch } : u))
      );
      setEditingUser(null);
    } catch (error) {
      toastApiError(error, tAdmin('failedToUpdateUser', 'Failed to update user'));
    } finally {
      setEditSubmitting(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteSubmitting(true);
    try {
      await adminFetch<{ success: boolean }>(`/api/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      toast.success(`${deleteTarget.name} ${tAdmin('deleted', 'deleted')}`);
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      toastApiError(error, tAdmin('failedToDeleteUser', 'Failed to delete user'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) {
      return;
    }

    if (!resetPassword || resetPassword.length < 8) {
      toast.error(tAdmin('passwordAtLeastEightChars', 'Password must be at least 8 characters'));
      return;
    }

    setResetSubmitting(true);
    try {
      await adminFetch<{ success: boolean }>(`/api/users/${resetTarget.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: resetPassword }),
      });
      toast.success(`${tAdmin('passwordResetFor', 'Password reset for')} ${resetTarget.name}`);
      setResetTarget(null);
      setResetPassword('');
    } catch (error) {
      toastApiError(error, tAdmin('failedToResetPassword', 'Failed to reset password'));
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleInviteUser = async (user: AdminUser) => {
    try {
      const response = await adminFetch<{ success: boolean; inviteUrl: string; verificationUrl: string }>(
        `/api/users/${user.id}/invite`,
        { method: 'POST' }
      );
      toast.success(`${tAdmin('invitationSentTo', 'Invitation sent to')} ${user.email}`);
      if (response.inviteUrl) {
        console.log('Invite link:', response.inviteUrl);
      }
    } catch (error) {
      toastApiError(error, tAdmin('failedToSendInvite', 'Failed to send invite'));
    }
  };


  useEffect(() => {
    if (!editingUser) {
      return;
    }
    void loadRoleImpactPreview();
  }, [editingUser, editForm.role, editForm.branchId, editForm.isActive, loadRoleImpactPreview]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      {/* 1. Header & Primary Action */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">User Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage system users, roles, and branch assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading} className="bg-white">
            <RefreshCcw className="mr-1 h-4 w-4" /> {tAdmin('refresh', 'Refresh')}
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-colors">
                <Plus className="h-4 w-4" /> {tAdmin('createUser', 'Create User')}
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{tAdmin('createAdminUser', 'Create Admin User')}</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{tAdmin('fullName', 'Full Name')}</Label>
                  <Input
                    value={createForm.name}
                    onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={tAdmin('enterFullName', 'e.g. Selam Tesfay')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{tAdmin('email', 'Email')}</Label>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder={tAdmin('adminEmailPlaceholder', 'name@zemen.com')}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{tAdmin('initialPassword', 'Initial Password')}</Label>
                  <Input
                    type="password"
                    value={createForm.password}
                    onChange={e => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={tAdmin('minimum8Characters', 'Minimum 8 characters')}
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{tAdmin('role', 'Role')}</Label>
                  <select
                    value={createForm.role}
                    onChange={e => {
                      const role = e.target.value as AdminRole;
                      setCreateForm(prev => ({
                        ...prev,
                        role,
                        branchId: roleRequiresBranch(role) ? prev.branchId : '',
                      }));
                    }}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                  >
                    <option value="" disabled>{tAdmin('selectRole', 'Select role')}</option>
                    {ADMIN_ROLE_VALUES.map(role => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </div>

                {user?.role !== 'BRANCH_MANAGER' && (
                  <div className="space-y-1.5 col-span-2">
                    <Label>{tAdmin('branch', 'Branch')}</Label>
                    <Select value={createForm.branchId || 'NONE'} onValueChange={(v) => setCreateForm(prev => ({ ...prev, branchId: v === 'NONE' ? '' : v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={tAdmin('selectBranch', 'Select branch')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE" disabled>{tAdmin('selectBranch', 'Select branch')}</SelectItem>
                        <SelectItem value="NONE">{tAdmin('noBranch', 'No Branch')}</SelectItem>
                        {branches.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {roleRequiresBranch(createForm.role) ? (
                      <p className="text-xs text-orange-600">{tAdmin('branchRequiredForRole', 'Branch is required for this role.')}</p>
                    ) : null}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>{tAdmin('cancel', 'Cancel')}</Button>
                <Button onClick={() => void handleCreateUser()} disabled={createSubmitting}>
                  {createSubmitting ? tAdmin('creating', 'Creating…') : tAdmin('createUser', 'Create User')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={tAdmin('searchByNameEmailBranch', 'Search by name, email, branch...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white shadow-sm border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm"
          />
        </div>

        <select
          className="bg-white shadow-sm border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer transition-shadow"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as 'ALL' | AdminRole)}
        >
          <option value="ALL">{tAdmin('allRoles', 'All Roles')}</option>
          {ADMIN_ROLE_VALUES.map(role => (
            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
          ))}
        </select>

        <select
          className="bg-white shadow-sm border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer transition-shadow"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
        >
          <option value="ALL">{tAdmin('allStatuses', 'All Statuses')}</option>
          <option value="ACTIVE">{tAdmin('active', 'Active')}</option>
          <option value="INACTIVE">{tAdmin('inactive', 'Inactive')}</option>
        </select>

        {user?.role !== 'BRANCH_MANAGER' && (
          <select
            className="bg-white shadow-sm border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer transition-shadow"
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
          >
            <option value="ALL">{tAdmin('allBranches', 'All Branches')}</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* 3. Table Card Container */}
      {loading ? (
        <p className="rounded-md p-4 text-sm text-muted-foreground">Loading users...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-sm">
              <thead className="bg-slate-900 text-white font-semibold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 font-semibold">{tAdmin('user', 'User')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('role', 'Role')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('branch', 'Branch')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('status', 'Status')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('lastLogin', 'Last Login')}</th>
                  <th className="px-4 py-3 font-semibold text-center">{tAdmin('actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={6}>No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => openEditDialog(u)}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-slate-900">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleChip role={u.role} label={ROLE_LABELS[u.role]} />
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{u.branch?.name || tAdmin('noBranch', 'No Branch')}</td>
                      <td className="px-4 py-3"><StatusBadge status={toStatusLabel(u.isActive)} /></td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-medium">{formatDateTime(u.lastLogin, tAdmin('never', 'Never'))}</td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-6">
                          <button
                            onClick={() => openEditDialog(u)}
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                            title={tAdmin('edit', 'Edit')}
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => { setResetTarget(u); setResetPassword(''); }}
                            className="text-slate-400 hover:text-amber-600 transition-colors"
                            title={tAdmin('resetPassword', 'Reset Password')}
                          >
                            <KeyRound className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                            title={tAdmin('delete', 'Delete')}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4 border-t border-slate-100">
            <span className="text-sm text-slate-500 font-medium">
              Showing {total === 0 ? 0 : (page - 1) * limit + 1}-
              {Math.min(page * limit, total)} of {total}
            </span>
            <div className="flex gap-2 items-center">
              <button
                className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm border border-slate-200"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="text-sm font-bold text-slate-500 px-2">{page} / {totalPages}</span>
              <button
                className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm border border-slate-200"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Dialog */}
<Dialog open={Boolean(editingUser)} onOpenChange={open => !open && setEditingUser(null)}>
  <DialogContent className="sm:max-w-[600px]">
    <DialogHeader>
      <DialogTitle>{tAdmin('editUser', 'Edit User')}</DialogTitle>
    </DialogHeader>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label>{tAdmin('fullName', 'Full Name')}</Label>
        <Input placeholder={tAdmin('enterFullName', 'e.g. Selam Tesfay')} value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} autoComplete="off" />
      </div>

      <div className="space-y-1.5">
        <Label>{tAdmin('email', 'Email')}</Label>
        <Input type="email" placeholder={tAdmin('adminEmailPlaceholder', 'e.g. selam@zemen.com')} value={editForm.email} onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} autoComplete="off" />
      </div>

      <div className="space-y-1.5">
        <Label>{tAdmin('role', 'Role')}</Label>
        <select
          value={editForm.role}
          onChange={e => {
            const role = e.target.value as AdminRole;
            setEditForm(prev => ({
              ...prev,
              role,
              branchId: roleRequiresBranch(role) ? prev.branchId : '',
            }));
          }}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2"
        >
          {ADMIN_ROLE_VALUES.map(role => (
            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>{tAdmin('status', 'Status')}</Label>
        <select
          value={editForm.isActive ? 'ACTIVE' : 'INACTIVE'}
          onChange={e => setEditForm(prev => ({ ...prev, isActive: e.target.value === 'ACTIVE' }))}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2"
        >
          <option value="ACTIVE">{tAdmin('active', 'Active')}</option>
          <option value="INACTIVE">{tAdmin('inactive', 'Inactive')}</option>
        </select>
      </div>

      {user?.role === 'BRANCH_MANAGER' ? null : (
        <div className="space-y-1.5 col-span-2">
          <Label>{tAdmin('branch', 'Branch')}</Label>
          <Select value={editForm.branchId || 'NONE'} onValueChange={(v) => setEditForm(prev => ({ ...prev, branchId: v === 'NONE' ? '' : v }))}>
            <SelectTrigger>
              <SelectValue placeholder={tAdmin('selectBranch', 'Select branch')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE" disabled>{tAdmin('selectBranch', 'Select branch')}</SelectItem>
              <SelectItem value="NONE">{tAdmin('noBranch', 'No Branch')}</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {roleRequiresBranch(editForm.role) ? (
            <p className="text-xs text-orange-600">{tAdmin('branchRequiredForRole', 'Branch is required for this role.')}</p>
          ) : null}
        </div>
      )}

      {/* Role impact preview - Fixed layout wrapping and corrected missing syntax brackets */}
      {roleImpactLoading && <p className="col-span-2 text-sm text-muted-foreground">{tAdmin('loading', 'Loading...')}</p>}
      {roleImpactPreview && (
        <div className="col-span-2 space-y-1 pt-2">
          {roleImpactPreview.impacts?.map((impact, idx) => (
            <p key={idx} className={impact.level === 'error' ? 'text-red-600 text-sm' : impact.level === 'warning' ? 'text-yellow-600 text-sm' : 'text-green-600 text-sm'}>
              {impact.message}
            </p>
          ))}
          {roleImpactPreview.added?.map((item, idx) => (
            <p key={`added-${idx}`} className="text-green-600 text-sm">+ {item}</p>
          ))}
          {roleImpactPreview.removed?.map((item, idx) => (
            <p key={`removed-${idx}`} className="text-red-600 text-sm">- {item}</p>
          ))}
        </div>
      )}
    </div>

    <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {editingUser && (
          <Button variant="outline" type="button" onClick={() => setResetTarget(editingUser)} className="text-slate-600 gap-1.5">
            <KeyRound className="h-4 w-4" /> {tAdmin('resetPassword', 'Reset Password')}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <Button variant="outline" onClick={() => setEditingUser(null)}>{tAdmin('cancel', 'Cancel')}</Button>
        <Button onClick={() => void handleUpdateUser()} disabled={editSubmitting}>{editSubmitting ? tAdmin('saving', 'Saving…') : tAdmin('saveChanges', 'Save Changes')}</Button>
      </div>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* Reset Password Dialog */}
<Dialog open={Boolean(resetTarget)} onOpenChange={open => !open && setResetTarget(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{tAdmin('resetPassword', 'Reset Password')}</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <p>{tAdmin('resetPasswordFor', 'Reset password for')} {resetTarget?.name}</p>
      <Input type="password" placeholder={tAdmin('newPassword', 'New password')} value={resetPassword} onChange={e => setResetPassword(e.target.value)} autoComplete="new-password" />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setResetTarget(null)}>{tAdmin('cancel', 'Cancel')}</Button>
      <Button onClick={() => void handleResetPassword()} disabled={resetSubmitting}>{resetSubmitting ? tAdmin('resetting', 'Resetting…') : tAdmin('reset', 'Reset')}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* Delete User Modal */}
<ConfirmDeleteModal
  open={Boolean(deleteTarget)}
  loading={deleteSubmitting}
  title={`Delete ${deleteTarget?.name || 'User'}?`}
  description="Are you sure you want to permanently delete this user? This action cannot be undone."
  onConfirm={() => void confirmDeleteUser()}
  onClose={() => setDeleteTarget(null)}
/>
    </div>
  );
}
