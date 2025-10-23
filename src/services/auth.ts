// src/services/auth.ts
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, refreshTokens, seniors } from '../db/schema';
import type { User, RegisterRequest, JWTPayload } from '../types/auth';

export class AuthService {
  
  // Hash password using Bun's built-in password hashing
  static async hashPassword(password: string): Promise<string> {
    return await Bun.password.hash(password);
  }

  // Verify password
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await Bun.password.verify(password, hash);
  }

  // Create user
  static async createUser(userData: RegisterRequest): Promise<User | null> {
    try {
      const passwordHash = await this.hashPassword(userData.password);
      
      const [newUser] = await db.insert(users).values({
        username: userData.username,
        email: userData.email,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'senior',
      }).returning();

      if (!newUser) return null;

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = newUser;
      return userWithoutPassword as User;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  // Find user by username
  static async findUserByUsername(username: string): Promise<(User & { passwordHash: string }) | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user as (User & { passwordHash: string }) || null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  }

  // Find user by ID
  static async findUserById(id: number): Promise<User | null> {
    try {
      const [user] = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
        assignedBy: users.assignedBy,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }).from(users).where(eq(users.id, id));
      
      return user || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      return null;
    }
  }

  // Get senior ID for user (if they are a senior)
  static async getSeniorIdForUser(userId: number): Promise<number | null> {
    try {
      const [senior] = await db.select({ id: seniors.id })
        .from(seniors)
        .where(eq(seniors.userId, userId));
      
      return senior?.id || null;
    } catch (error) {
      console.error('Error getting senior ID:', error);
      return null;
    }
  }

  // Store refresh token
  static async storeRefreshToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    try {
      await db.insert(refreshTokens).values({
        userId,
        token,
        expiresAt,
      });
    } catch (error) {
      console.error('Error storing refresh token:', error);
    }
  }

  // Validate refresh token
  static async validateRefreshToken(token: string): Promise<number | null> {
    try {
      const [tokenRecord] = await db.select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, token));

      if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        return null;
      }

      return tokenRecord.userId;
    } catch (error) {
      console.error('Error validating refresh token:', error);
      return null;
    }
  }

  // Remove refresh token
  static async removeRefreshToken(token: string): Promise<void> {
    try {
      await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
    } catch (error) {
      console.error('Error removing refresh token:', error);
    }
  }

  // Generate JWT payload
  static async generateJWTPayload(user: User): Promise<JWTPayload> {
    const seniorId = user.role === 'senior' ? await this.getSeniorIdForUser(user.id) : undefined;
    
    return {
      userId: user.id,
      username: user.username,
      role: user.role,
      seniorId: seniorId || undefined,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };
  }
}
