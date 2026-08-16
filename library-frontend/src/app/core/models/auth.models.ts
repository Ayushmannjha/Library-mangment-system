/**
 * auth.models.ts
 * Auth module ke liye saare TypeScript interfaces define kiye hain.
 * Ye interfaces backend API ke response structure se match karte hain.
 */

// ---------- Request Models ----------

/** Login endpoint ke liye request body */
export interface LoginRequest {
  email: string;
  password: string;
}

// ---------- Response Models ----------

/** Backend se aane wala JWT token pair */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Login API ka pura response (envelope ke andar data)
 * Backend: POST /api/v1/auth/login
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

/** Backend ka standard response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  statusCode?: number;
  meta?: Record<string, any>;
}

// ---------- User / Profile Models ----------

/** Role object jaisa backend se aata hai */
export interface UserRole {
  id: number;
  role: {
    id: number;
    name: string; // e.g. "SUPER_ADMIN", "ADMIN", "USER"
  };
}

/**
 * GET /api/v1/auth/me ka response
 * Current logged-in user ki poori profile
 */
export interface UserProfile {
  id: string;
  email: string | null;
  first_name?: string;
  last_name?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  library_id: string | null; // null = Super Admin (no library)
  roles: RoleName[];
}

// ---------- Permission Models ----------

/** Ek individual permission ka structure */
export interface Permission {
  id: number;
  name: string;   // e.g. "STUDENT_CREATE"
  module: string; // e.g. "STUDENTS"
}

/** Ek Role ka full structure permissions ke sath */
export interface Role {
  id: number;
  name: string;
  description?: string;
  role_permissions: { permission: Permission }[];
}

// ---------- Helper Types ----------

/** Application mein supported role names */
export type RoleName = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
