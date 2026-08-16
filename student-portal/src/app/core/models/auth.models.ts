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

/**
 * Current logged-in user ki profile.
 * Login response (toSafeUser) aur GET /auth/me (AuthenticatedUser) dono is shape
 * mein map hote hain. `roles` sirf /auth/me se aati hai.
 */
export interface UserProfile {
  id: string;
  email: string | null;
  first_name?: string;
  last_name?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  library_id: string | null; // null = Super Admin (no library)
  student_id: string | null; // linked student when this is a student login
  roles: RoleName[];
  permissions?: string[];
}

// ---------- Helper Types ----------

/** Application mein supported role names */
export type RoleName = 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'STUDENT';
