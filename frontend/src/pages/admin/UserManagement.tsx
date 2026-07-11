import { ChevronDown, Plus, RefreshCcw, Search } from 'lucide-react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminApi';
import { toastApiError } from '@/lib/apiToast';
import { ROLE_LABELS, roleRequiresBranch, type AdminRole, ADMIN_ROLE_VALUES } from '@/lib/adminRbac';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/admin/StatusBadge';
import RoleChip from '@/components/admin/RoleChip';
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
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RoleImpactPreview {
  impacts: Array<{ level: 'info' | 'warning' | 'error'; code: string; message: string }>;
  canSave: boolean;
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
  role: 'MEMBERSHIP_OFFICER',
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
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [ ,setRoleAccess] = useState<RoleAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | AdminRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [branchFilter, setBranchFilter] = useState<'ALL' | string>('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
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

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'NONE' | 'ACTIVATE' | 'DEACTIVATE' | 'ASSIGN_BRANCH'>('NONE');
  const [bulkBranchId, setBulkBranchId] = useState<string>('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [deactivationTarget, setDeactivationTarget] = useState<AdminUser | null>(null);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [deactivateSubmitting, setDeactivateSubmitting] = useState(false);

  const searchQueryRef = useRef(searchQuery);
  const roleFilterRef = useRef(roleFilter);
  const statusFilterRef = useRef(statusFilter);
  const branchFilterRef = useRef(branchFilter);
  const pageRef = useRef(page);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const userParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });

      if (searchQueryRef.current.trim()) userParams.set('search', searchQueryRef.current.trim());
      if (roleFilterRef.current !== 'ALL') userParams.set('role', roleFilterRef.current);
      if (statusFilterRef.current === 'ACTIVE') userParams.set('status', 'active');
      if (statusFilterRef.current === 'INACTIVE') userParams.set('status', 'inactive');
      if (branchFilterRef.current && branchFilterRef.current !== 'ALL') userParams.set('branch', branchFilterRef.current);

      const [usersResponse, branchesResponse, accessResponse] = await Promise.all([
        adminFetch<{ users: AdminUser[]; pagination: { total: number; page: number; limit: number } }>(`/api/admin/settings/users?${userParams.toString()}`),
        adminFetch<{ branches: Branch[] }>('/api/admin/settings/branches'),
        adminFetch<{ roles: RoleAccess[] }>(`/api/admin/settings/access-control`),
      ]);

      setUsers(usersResponse.users);
      setTotal(usersResponse.pagination.total);
      setBranches(branchesResponse.branches);
      setRoleAccess(accessResponse.roles);
    } catch (error) {
      toastApiError(error, tAdmin('failedToLoadUserManagementData', 'Failed to load user management data'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, tAdmin,setRoleAccess]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
    roleFilterRef.current = roleFilter;
    statusFilterRef.current = statusFilter;
    branchFilterRef.current = branchFilter;
  }, [searchQuery, roleFilter, statusFilter, branchFilter]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

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
      await adminFetch<{ user: AdminUser }>('/api/admin/settings/users', {
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
      const response = await adminFetch<RoleImpactPreview>(`/api/admin/settings/users/${editingUser.id}/role-impact-preview`, {
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
    if (preview && !preview.canSave) {
      toast.error(tAdmin('resolveRoleImpactBlockers', 'Resolve role impact blockers before saving this user'));
      return;
    }

    setEditSubmitting(true);
    try {
      const response = await adminFetch<{ user: AdminUser }>(`/api/admin/settings/users/${editingUser.id}`, {
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

  const confirmDeactivateUser = async () => {
    if (!deactivationTarget) {
      return;
    }

    if (deactivationReason.trim().length < 5) {
      toast.error(tAdmin('reasonAtLeastFiveChars', 'Reason must be at least 5 characters'));
      return;
    }

    setDeactivateSubmitting(true);
    try {
      await adminFetch<{ success: boolean }>(`/api/admin/settings/users/${deactivationTarget.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: deactivationReason.trim() }),
      });
      toast.success(`${deactivationTarget.name} ${tAdmin('deactivated', 'deactivated')}`);
      setDeactivationTarget(null);
      setDeactivationReason('');
      await loadData();
    } catch (error) {
      toastApiError(error, tAdmin('failedToDeactivateUser', 'Failed to deactivate user'));
    } finally {
      setDeactivateSubmitting(false);
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
      await adminFetch<{ success: boolean }>(`/api/admin/settings/users/${resetTarget.id}/password`, {
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
        `/api/admin/settings/users/${user.id}/invite`,
        { method: 'POST' }
      );
      await navigator.clipboard.writeText(`${response.inviteUrl}\n${response.verificationUrl}`);
      toast.success(`${tAdmin('inviteLinksCopiedFor', 'Invite and verification links copied for')} ${user.name}`);
    } catch (error) {
      toastApiError(error, tAdmin('failedToCreateInvitation', 'Failed to create invitation'));
    }
  };

  const handleToggleUserSelection = (userId: string, selected: boolean) => {
    setSelectedUserIds(prev => {
      if (selected) {
        return prev.includes(userId) ? prev : [...prev, userId];
      }
      return prev.filter(id => id !== userId);
    });
  };

  const allUsersSelected = filteredUsers.length > 0 && filteredUsers.every(user => selectedUserIds.includes(user.id));

  const handleBulkAction = async () => {
    if (bulkAction === 'NONE') {
      toast.error(tAdmin('selectBulkActionFirst', 'Select a bulk action first'));
      return;
    }

    if (selectedUserIds.length === 0) {
      toast.error(tAdmin('selectAtLeastOneUser', 'Select at least one user'));
      return;
    }

    if (bulkAction === 'ASSIGN_BRANCH' && !bulkBranchId) {
      toast.error(tAdmin('selectBranchForReassignment', 'Select a branch for reassignment'));
      return;
    }

    setBulkSubmitting(true);
    try {
      const payload: {
        action: 'ACTIVATE' | 'DEACTIVATE' | 'ASSIGN_BRANCH';
        userIds: string[];
        branchId?: string | null;
        reason?: string;
      } = { action: bulkAction, userIds: selectedUserIds };

      if (bulkAction === 'ASSIGN_BRANCH') {
        payload.branchId = bulkBranchId;
      }

      const response = await adminFetch<{ success: boolean; affectedCount: number }>('/api/admin/settings/users/bulk', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success(`${tAdmin('bulkActionCompletedFor', 'Bulk action completed for')} ${response.affectedCount} ${tAdmin('users', 'users')}`);
      setSelectedUserIds([]);
      setBulkAction('NONE');
      setBulkBranchId('');
      await loadData();
    } catch (error) {
      toastApiError(error, tAdmin('failedToRunBulkUserAction', 'Failed to run bulk user action'));
    } finally {
      setBulkSubmitting(false);
    }
  };

  useEffect(() => {
    if (!editingUser) {
      return;
    }
    void loadRoleImpactPreview();
  }, [editingUser, editForm.role, editForm.branchId, editForm.isActive, loadRoleImpactPreview]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/*<div>
          <h1 className="font-serif text-2xl text-foreground">{tAdmin('userRoleManagement', 'User & Role Management')}</h1>
          <p className="text-sm text-muted-foreground">
            {tAdmin('userRoleManagementSubheading', 'Create and manage admin users with role-based access control.')}
          </p>
        </div>*/}

        <div className="flex items-center justify-end gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> {tAdmin('refresh', 'Refresh')}
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> {tAdmin('createUser', 'Create User')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{tAdmin('createAdminUser', 'Create Admin User')}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{tAdmin('fullName', 'Full Name')}</Label>
                  <Input
                    value={createForm.name}
                    onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={tAdmin('enterFullName', 'Enter full name')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{tAdmin('email', 'Email')}</Label>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder={tAdmin('adminEmailPlaceholder', 'name@zemen.com')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{tAdmin('initialPassword', 'Initial Password')}</Label>
                  <Input
                    type="password"
                    value={createForm.password}
                    onChange={e => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={tAdmin('minimum8Characters', 'Minimum 8 characters')}
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
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2"
                  >
                    <option value="" disabled>{tAdmin('selectRole', 'Select role')}</option>
                    {ADMIN_ROLE_VALUES.map(role => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>{tAdmin('branch', 'Branch')}</Label>
                  <select
                    value={createForm.branchId || ''}
                    onChange={e => setCreateForm(prev => ({ ...prev, branchId: e.target.value }))}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2"
                  >
                    <option value="" disabled>{tAdmin('selectBranch', 'Select branch')}</option>
                    <option value="" >{tAdmin('noBranch', 'No Branch')}</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                  {roleRequiresBranch(createForm.role) ? (
                    <p className="text-xs text-orange-600">{tAdmin('branchRequiredForRole', 'Branch is required for this role.')}</p>
                  ) : null}
                </div>
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

      {/* Filters and Bulk Actions */}
           {/* Filters and Bulk Actions */}
      <div className="flex items-center gap-2 overflow-x-auto w-full pb-1">
        {/* Search input container - dynamically scales up to 240px */}
        <div className="relative flex-1 min-w-[160px] max-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 w-full"
            placeholder={tAdmin('searchByNameEmailBranch', 'Search by name, email, branch')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={roleFilter} onValueChange={value => setRoleFilter(value as 'ALL' | AdminRole)} aria-label={tAdmin('filterByRole', 'Filter by role')}>
          <SelectTrigger className="w-[120px] shrink-0">
            <SelectValue placeholder={tAdmin('filterByRole', 'Filter by role')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{tAdmin('allRoles', 'All Roles')}</SelectItem>
            {ADMIN_ROLE_VALUES.map(role => (
              <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={value => setStatusFilter(value as 'ALL' | 'ACTIVE' | 'INACTIVE')} aria-label={tAdmin('filterByStatus', 'Filter by status')}>
          <SelectTrigger className="w-[115px] shrink-0">
            <SelectValue placeholder={tAdmin('filterByStatus', 'Filter by status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{tAdmin('allStatuses', 'All Statuses')}</SelectItem>
            <SelectItem value="ACTIVE">{tAdmin('active', 'Active')}</SelectItem>
            <SelectItem value="INACTIVE">{tAdmin('inactive', 'Inactive')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={branchFilter} onValueChange={value => setBranchFilter(value as 'ALL' | string)} aria-label={tAdmin('filterByBranch', 'Filter by branch')}>
          <SelectTrigger className="w-[120px] shrink-0">
            <SelectValue placeholder={tAdmin('filterByBranch', 'Filter by branch')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{tAdmin('allBranches', 'All Branches')}</SelectItem>
            {branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-4 w-[1px] bg-border shrink-0 mx-1" />

        <Select value={bulkAction} onValueChange={value => setBulkAction(value as 'NONE' | 'ACTIVATE' | 'DEACTIVATE' | 'ASSIGN_BRANCH')} aria-label={tAdmin('selectBulkAction', 'Bulk action')}>
          <SelectTrigger className="w-[120px] shrink-0">
            <SelectValue placeholder={tAdmin('bulkAction', 'Bulk action')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">{tAdmin('selectAction', 'Select action')}</SelectItem>
            <SelectItem value="ACTIVATE">{tAdmin('activateUsers', 'Activate users')}</SelectItem>
            <SelectItem value="DEACTIVATE">{tAdmin('deactivateUsers', 'Deactivate users')}</SelectItem>
            <SelectItem value="ASSIGN_BRANCH">{tAdmin('reassignBranch', 'Reassign branch')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 shrink-0">
          <Select value={bulkBranchId || 'NONE'} onValueChange={value => setBulkBranchId(value === 'NONE' ? '' : value)} aria-label={tAdmin('bulkBranch', 'Bulk branch')} disabled={bulkAction !== 'ASSIGN_BRANCH'}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder={tAdmin('selectBranch', 'Select branch')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">{tAdmin('noBranch', 'No Branch')}</SelectItem>
              {branches.map(branch => (
                <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" className="whitespace-nowrap" onClick={() => void handleBulkAction()} disabled={bulkSubmitting}>
            {bulkSubmitting ? tAdmin('applying', 'Applying...') : `${tAdmin('applyTo', 'Apply to')} ${selectedUserIds.length}`}
          </Button>
        </div>
      </div>


      {/* Users Table */}


        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allUsersSelected}
                  onChange={event => {
                    if (event.target.checked) {
                      setSelectedUserIds(filteredUsers.map(user => user.id));
                    } else {
                      setSelectedUserIds([]);
                    }
                  }}
                  aria-label={tAdmin('selectAllUsers', 'Select all users')}
                />
              </th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tAdmin('user', 'User')}</th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tAdmin('role', 'Role')}</th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tAdmin('branch', 'Branch')}</th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tAdmin('emailVerification', 'Email Verification')}</th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tAdmin('status', 'Status')}</th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tAdmin('lastLogin', 'Last Login')}</th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tAdmin('actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4 text-sm text-muted-foreground" colSpan={8}>Loading users…</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-muted-foreground" colSpan={8}>No users found.</td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-3 align-top">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={event => handleToggleUserSelection(user.id, event.target.checked)}
                      aria-label={`${tAdmin('select', 'Select')} ${user.name}`}
                    />
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-foreground">
                    <RoleChip role={user.role} label={ROLE_LABELS[user.role]} />
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{user.branch?.name || tAdmin('noBranch', 'No Branch')}</td>
                  <td className="p-3">
                    <StatusBadge status={user.emailVerified ? 'Verified' : 'Pending'} />
                  </td>
                  <td className="p-3"><StatusBadge status={toStatusLabel(user.isActive)} /></td>
                  <td className="p-3 text-xs text-muted-foreground">{formatDateTime(user.lastLogin, tAdmin('never', 'Never'))}</td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          {tAdmin('actions', 'Actions')}
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openEditDialog(user)}>{tAdmin('edit', 'Edit')}</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setResetTarget(user)}>{tAdmin('reset', 'Reset')}</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void handleInviteUser(user)}>{tAdmin('invite', 'Invite')}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={!user.isActive}
                          onSelect={() => { setDeactivationTarget(user); setDeactivationReason(''); }}
                        >
                          {tAdmin('deactivate', 'Deactivate')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs text-muted-foreground rounded-b-2xl">
          <p className="text-xs text-muted-foreground">{tAdmin('page', 'Page')} {page} {tAdmin('of', 'of')} {totalPages} | {tAdmin('totalUsers', 'Total users')}: {total}</p>
          <div className="flex items-center gap-2">
            <Select value={String(limit)} onValueChange={value => { setLimit(Number(value)); setPage(1); }}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">{tAdmin('adminPageSize10', '10 / page')}</SelectItem>
                <SelectItem value="20">{tAdmin('adminPageSize20', '20 / page')}</SelectItem>
                <SelectItem value="50">{tAdmin('adminPageSize50', '50 / page')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={page <= 1}>{tAdmin('previous', 'Previous')}</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(prev => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>{tAdmin('next', 'Next')}</Button>
          </div>
        </div>
      </div>)

      {/* Edit User Dialog */}
<Dialog open={Boolean(editingUser)} onOpenChange={open => !open && setEditingUser(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{tAdmin('editUser', 'Edit User')}</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{tAdmin('fullName', 'Full Name')}</Label>
        <Input placeholder={tAdmin('enterFullName', 'e.g. Selam Tesfay')} value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} />
      </div>

      <div className="space-y-1.5">
        <Label>{tAdmin('email', 'Email')}</Label>
        <Input type="email" placeholder={tAdmin('adminEmailPlaceholder', 'e.g. selam@zemen.com')} value={editForm.email} onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} />
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
        <Label>{tAdmin('branch', 'Branch')}</Label>
        <select
          value={editForm.branchId || ''}
          onChange={e => setEditForm(prev => ({ ...prev, branchId: e.target.value }))}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2"
        >
          {/* Changed second duplicate placeholder key to explicit text string fallback value */}
          <option value="" disabled>{tAdmin('selectBranch', 'Select branch')}</option>
          <option value="NONE">{tAdmin('noBranch', 'No Branch')}</option>
          {branches.map(branch => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
        {roleRequiresBranch(editForm.role) ? (
          <p className="text-xs text-orange-600">{tAdmin('branchRequiredForRole', 'Branch is required for this role.')}</p>
        ) : null}
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

      {/* Role impact preview - Fixed layout wrapping and corrected missing syntax brackets */}
      {roleImpactLoading && <p className="text-sm text-muted-foreground">{tAdmin('loading', 'Loading...')}</p>}
      {roleImpactPreview && (
        <div className="space-y-1 pt-2">
          {roleImpactPreview.impacts.map((impact, idx) => (
            <p key={idx} className={impact.level === 'error' ? 'text-red-600 text-sm' : impact.level === 'warning' ? 'text-yellow-600 text-sm' : 'text-green-600 text-sm'}>
              {impact.message}
            </p>
          ))}
        </div>
      )}
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setEditingUser(null)}>{tAdmin('cancel', 'Cancel')}</Button>
      <Button onClick={() => void handleUpdateUser()} disabled={editSubmitting}>{editSubmitting ? tAdmin('saving', 'Saving…') : tAdmin('saveChanges', 'Save Changes')}</Button>
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
      <Input type="password" placeholder={tAdmin('newPassword', 'New password')} value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setResetTarget(null)}>{tAdmin('cancel', 'Cancel')}</Button>
      <Button onClick={() => void handleResetPassword()} disabled={resetSubmitting}>{resetSubmitting ? tAdmin('resetting', 'Resetting…') : tAdmin('reset', 'Reset')}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* Deactivate User Dialog */}
<Dialog open={Boolean(deactivationTarget)} onOpenChange={open => !open && setDeactivationTarget(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{tAdmin('deactivateUser', 'Deactivate User')}</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <p>{tAdmin('deactivateUserConfirm', 'Are you sure you want to deactivate')} {deactivationTarget?.name}?</p>
      <Textarea placeholder={tAdmin('deactivationReason', 'Reason for deactivation')} value={deactivationReason} onChange={e => setDeactivationReason(e.target.value)} />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setDeactivationTarget(null)}>{tAdmin('cancel', 'Cancel')}</Button>
      <Button variant="destructive" onClick={() => void confirmDeactivateUser()} disabled={deactivateSubmitting}>{deactivateSubmitting ? tAdmin('deactivating', 'Deactivating…') : tAdmin('deactivate', 'Deactivate')}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>}
