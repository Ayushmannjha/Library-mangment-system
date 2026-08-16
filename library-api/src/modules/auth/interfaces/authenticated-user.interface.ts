/**
 * Trusted authenticated-user context attached to `request.user` by
 * JwtAuthGuard (AGENTS.md Part 2 rule 15).
 *
 * IMPORTANT: this context is ALWAYS derived from the verified JWT + freshest
 * DB lookup — never from request bodies — so tenant isolation and RBAC can
 * rely on it without trusting client-supplied values.
 */
export interface AuthenticatedUser {
  /** users.id as string (avoids BigInt JSON serialization issues in JWT/headers) */
  id: string;
  email: string | null;
  /** owning tenant; null for SUPER_ADMIN / platform-level users */
  library_id: bigint | null;
  /** linked student id when this user is a student login; null otherwise */
  student_id: bigint | null;
  /** role codes resolved from user_roles, e.g. ["ADMIN", "USER"] */
  roles: string[];
  /** permission codes resolved from role_permissions, e.g. ["STUDENT_CREATE"] */
  permissions: string[];
}
