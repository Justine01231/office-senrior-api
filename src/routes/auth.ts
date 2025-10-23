// src/routes/auth.ts
import { Elysia, t } from 'elysia';
import { AuthService } from '../services/auth';
import * as jwt from 'jsonwebtoken';
import type { LoginRequest, RegisterRequest, RefreshTokenRequest, AuthResponse } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'office-seniors-super-secret-jwt-key-2024-change-this-in-production';

export const authRoutes = new Elysia({ prefix: '/auth' })
  
  // Register endpoint
  .post('/register', async ({ body, set }) => {
    try {
      const { username, email, password, firstName, lastName, role } = body as RegisterRequest;

      // Validate input
      if (!username || !password) {
        set.status = 400;
        return {
          success: false,
          message: 'Username and password are required'
        } as AuthResponse;
      }

      // Check if user already exists
      const existingUser = await AuthService.findUserByUsername(username);
      if (existingUser) {
        set.status = 409;
        return {
          success: false,
          message: 'User with this username already exists'
        } as AuthResponse;
      }

      // Create user
      const user = await AuthService.createUser({
        username,
        email,
        password,
        firstName,
        lastName,
        role: role || 'senior'
      });

      if (!user) {
        set.status = 500;
        return {
          success: false,
          message: 'Failed to create user'
        } as AuthResponse;
      }

      // Generate tokens
      const jwtPayload = await AuthService.generateJWTPayload(user);
      const accessToken = jwt.sign(jwtPayload, JWT_SECRET);
      const refreshToken = crypto.randomUUID();

      // Store refresh token
      const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await AuthService.storeRefreshToken(user.id, refreshToken, refreshExpiry);

      return {
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          accessToken,
          refreshToken,
          expiresIn: 24 * 60 * 60 // 24 hours in seconds
        }
      } as AuthResponse;

    } catch (error) {
      console.error('Registration error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error'
      } as AuthResponse;
    }
  }, {
    body: t.Object({
      username: t.String({ minLength: 3 }),
      email: t.Optional(t.String({ format: 'email' })),
      password: t.String({ minLength: 6 }),
      firstName: t.Optional(t.String()),
      lastName: t.Optional(t.String()),
      role: t.Optional(t.Union([
        t.Literal('admin'),
        t.Literal('staff'),
        t.Literal('senior')
      ]))
    })
  })

  // Login endpoint
  .post('/login', async ({ body, set }) => {
    try {
      const { username, password } = body as LoginRequest;

      // Validate input
      if (!username || !password) {
        set.status = 400;
        return {
          success: false,
          message: 'Username and password are required'
        } as AuthResponse;
      }

      // Find user
      const userWithPassword = await AuthService.findUserByUsername(username);
      if (!userWithPassword) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid credentials'
        } as AuthResponse;
      }

      // Verify password
      const isPasswordValid = await AuthService.verifyPassword(password, userWithPassword.passwordHash);
      if (!isPasswordValid) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid credentials'
        } as AuthResponse;
      }

      // Check if user is active
      if (!userWithPassword.isActive) {
        set.status = 401;
        return {
          success: false,
          message: 'Account is deactivated'
        } as AuthResponse;
      }

      // Remove password from user object
      const { passwordHash, ...user } = userWithPassword;

      // Generate tokens
      const jwtPayload = await AuthService.generateJWTPayload(user);
      const accessToken = jwt.sign(jwtPayload, JWT_SECRET);
      const refreshToken = crypto.randomUUID();

      // Store refresh token
      const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await AuthService.storeRefreshToken(user.id, refreshToken, refreshExpiry);

      return {
        success: true,
        message: 'Login successful',
        data: {
          user,
          accessToken,
          refreshToken,
          expiresIn: 24 * 60 * 60 // 24 hours in seconds
        }
      } as AuthResponse;

    } catch (error) {
      console.error('Login error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error'
      } as AuthResponse;
    }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String()
    })
  })

  // Refresh token endpoint
  .post('/refresh', async ({ body, set }) => {
    try {
      const { refreshToken } = body as RefreshTokenRequest;

      if (!refreshToken) {
        set.status = 400;
        return {
          success: false,
          message: 'Refresh token is required'
        } as AuthResponse;
      }

      // Validate refresh token
      const userId = await AuthService.validateRefreshToken(refreshToken);
      if (!userId) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid or expired refresh token'
        } as AuthResponse;
      }

      // Get user
      const user = await AuthService.findUserById(userId);
      if (!user || !user.isActive) {
        set.status = 401;
        return {
          success: false,
          message: 'User not found or inactive'
        } as AuthResponse;
      }

      // Generate new tokens
      const jwtPayload = await AuthService.generateJWTPayload(user);
      const accessToken = jwt.sign(jwtPayload, JWT_SECRET);
      const newRefreshToken = crypto.randomUUID();

      // Remove old refresh token and store new one
      await AuthService.removeRefreshToken(refreshToken);
      const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await AuthService.storeRefreshToken(user.id, newRefreshToken, refreshExpiry);

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user,
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: 24 * 60 * 60 // 24 hours in seconds
        }
      } as AuthResponse;

    } catch (error) {
      console.error('Token refresh error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error'
      } as AuthResponse;
    }
  }, {
    body: t.Object({
      refreshToken: t.String()
    })
  })

  // Logout endpoint
  .post('/logout', async ({ body, set }) => {
    try {
      const { refreshToken } = body as RefreshTokenRequest;

      if (refreshToken) {
        await AuthService.removeRefreshToken(refreshToken);
      }

      return {
        success: true,
        message: 'Logged out successfully'
      } as AuthResponse;

    } catch (error) {
      console.error('Logout error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error'
      } as AuthResponse;
    }
  }, {
    body: t.Object({
      refreshToken: t.Optional(t.String())
    })
  })

  // Get current user endpoint
  .get('/me', async ({ headers, set }) => {
    try {
      const authorization = headers.authorization;
      if (!authorization || !authorization.startsWith('Bearer ')) {
        set.status = 401;
        return {
          success: false,
          message: 'Authorization header required'
        } as AuthResponse;
      }

      const token = authorization.split(' ')[1];
      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid authorization format'
        } as AuthResponse;
      }
      
      let payload;
      try {
        payload = jwt.verify(token, JWT_SECRET) as any;
      } catch (error) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid token'
        } as AuthResponse;
      }

      const user = await AuthService.findUserById(payload.userId);
      if (!user) {
        set.status = 401;
        return {
          success: false,
          message: 'User not found'
        } as AuthResponse;
      }

      return {
        success: true,
        message: 'User retrieved successfully',
        data: {
          user,
          accessToken: token,
          refreshToken: '',
          expiresIn: payload.exp - Math.floor(Date.now() / 1000)
        }
      } as AuthResponse;

    } catch (error) {
      console.error('Get user error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error'
      } as AuthResponse;
    }
  });
