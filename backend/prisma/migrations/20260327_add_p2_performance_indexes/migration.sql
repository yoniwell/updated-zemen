CREATE INDEX IF NOT EXISTS membership_applications_branch_status_created_at_idx
  ON membership_applications ("branchId", status, "createdAt");

CREATE INDEX IF NOT EXISTS membership_applications_assigned_status_created_at_idx
  ON membership_applications ("assignedToId", status, "createdAt");

CREATE INDEX IF NOT EXISTS loan_applications_branch_status_created_at_idx
  ON loan_applications ("branchId", status, "createdAt");

CREATE INDEX IF NOT EXISTS loan_applications_loan_type_status_created_at_idx
  ON loan_applications ("loanType", status, "createdAt");

CREATE INDEX IF NOT EXISTS loan_applications_assigned_status_created_at_idx
  ON loan_applications ("assignedToId", status, "createdAt");

CREATE INDEX IF NOT EXISTS documents_status_uploaded_at_idx
  ON documents (status, "uploadedAt");

CREATE INDEX IF NOT EXISTS documents_membership_status_idx
  ON documents ("membershipApplicationId", status);

CREATE INDEX IF NOT EXISTS documents_loan_status_idx
  ON documents ("loanApplicationId", status);

CREATE INDEX IF NOT EXISTS admin_users_role_active_branch_idx
  ON admin_users (role, "isActive", "branchId");

CREATE INDEX IF NOT EXISTS admin_users_last_login_idx
  ON admin_users ("lastLogin");

CREATE INDEX IF NOT EXISTS workflow_history_status_created_at_idx
  ON workflow_history ("fromStatus", "toStatus", "createdAt");

CREATE INDEX IF NOT EXISTS workflow_history_changed_by_created_at_idx
  ON workflow_history ("changedById", "createdAt");

CREATE INDEX IF NOT EXISTS workflow_history_membership_created_at_idx
  ON workflow_history ("membershipApplicationId", "createdAt");

CREATE INDEX IF NOT EXISTS workflow_history_loan_created_at_idx
  ON workflow_history ("loanApplicationId", "createdAt");

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
  ON audit_logs ("createdAt");

CREATE INDEX IF NOT EXISTS audit_logs_action_created_at_idx
  ON audit_logs (action, "createdAt");

CREATE INDEX IF NOT EXISTS audit_logs_target_type_created_at_idx
  ON audit_logs ("targetType", "createdAt");

CREATE INDEX IF NOT EXISTS audit_logs_user_id_created_at_idx
  ON audit_logs ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS audit_logs_ip_address_created_at_idx
  ON audit_logs ("ipAddress", "createdAt");

CREATE INDEX IF NOT EXISTS notification_events_type_timestamp_idx
  ON notification_events (type, timestamp);

CREATE INDEX IF NOT EXISTS notification_events_status_created_at_idx
  ON notification_events (status, "createdAt");

CREATE INDEX IF NOT EXISTS cms_download_files_category_published_sort_order_idx
  ON cms_download_files ("categoryId", published, "sortOrder");
