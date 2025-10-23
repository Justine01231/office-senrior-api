// src/types/auth.ts

export interface User {
  id: number;
  username: string;
  email?: string | null;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  assignedBy?: number | null;
  isActive: boolean | null;
  emailVerified: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'staff' | 'senior';
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: Omit<User, 'passwordHash'>;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  seniorId?: number;
  iat: number;
  exp: number;
}

export interface AuthContext {
  user: User;
  seniorId?: number;
}
