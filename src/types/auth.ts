// src/types/auth.ts

export interface User {
  id: number;
  email: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  isActive: boolean | null;
  emailVerified: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'ADMIN' | 'STAFF' | 'SENIOR' | 'FAMILY';
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
  email: string;
  role: string;
  seniorId?: number;
  iat: number;
  exp: number;
}

export interface AuthContext {
  user: User;
  seniorId?: number;
}
