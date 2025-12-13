// src/routes/profile.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'office-seniors-super-secret-jwt-key-2024-change-this-in-production';

console.log('👤 PROFILE ROUTES LOADED - INCLUDING /api/profile/complete ENDPOINT!');

export const profileRoutes = new Elysia({ prefix: '/api' })
  .derive(async ({ headers }) => {
    const authorization = headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new Error('Unauthorized');
    }
    
    const token = authorization.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      return { user: payload };
    } catch (error) {
      throw new Error('Invalid token');
    }
  })

  // GET /api/profile - Get current user profile
  .get('/profile', async ({ user }) => {
    console.log(`👤 GET PROFILE REQUEST: User=${user?.userId}, Role=${user?.role}`);
    
    try {
      if (!user) {
        throw new Error('Authentication required');
      }

      const userProfile = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        address: users.address,
        dateOfBirth: users.dateOfBirth,
        emergencyContactName: users.emergencyContactName,
        emergencyContactPhone: users.emergencyContactPhone,
        socialSecurity: users.socialSecurity,
        role: users.role,
        position: users.position,
        isActive: users.isActive,
        profileCompleted: users.profileCompleted,
        approvalStatus: users.approvalStatus,
        avatar: users.avatar,
        photoPath: users.photoPath,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(eq(users.id, (user as any).userId))
      .limit(1);

      if (!userProfile.length) {
        throw new Error('User not found');
      }

      console.log(`✅ Profile retrieved for user: ${userProfile[0]?.firstName} ${userProfile[0]?.lastName}`);

      return {
        success: true,
        message: 'Profile retrieved successfully',
        data: userProfile[0]
      };

    } catch (error: any) {
      console.error('❌ Get profile error:', error);
      return {
        success: false,
        message: error?.message || 'Failed to get profile'
      };
    }
  })

  // PUT /api/profile - Update current user profile
  .put('/profile', async ({ user, body }) => {
    console.log('👤 UPDATE PROFILE REQUEST: User=' + user?.userId, body);
    
    try {
      if (!user) {
        throw new Error('Authentication required');
      }

      const [updatedUser] = await db.update(users)
        .set({
          firstName: body.firstName || undefined,
          lastName: body.lastName || undefined,
          phone: body.phone || undefined,
          address: body.address || undefined,
          dateOfBirth: body.dateOfBirth || undefined,
          emergencyContactName: body.emergencyContactName || undefined,
          emergencyContactPhone: body.emergencyContactPhone || undefined,
          socialSecurity: body.socialSecurity || undefined,
          avatar: body.avatar || undefined,
          photoPath: body.photoPath || undefined,
          updatedAt: new Date()
        })
        .where(eq(users.id, (user as any).userId))
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          address: users.address,
          dateOfBirth: users.dateOfBirth,
          emergencyContactName: users.emergencyContactName,
          emergencyContactPhone: users.emergencyContactPhone,
          socialSecurity: users.socialSecurity,
          role: users.role,
          position: users.position,
          isActive: users.isActive,
          profileCompleted: users.profileCompleted,
          approvalStatus: users.approvalStatus,
          avatar: users.avatar,
          photoPath: users.photoPath,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        });

      if (!updatedUser) {
        throw new Error('Failed to update profile');
      }

      console.log(`✅ Profile updated for user: ${updatedUser?.firstName} ${updatedUser?.lastName}`);

      return {
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      };

    } catch (error: any) {
      console.error('❌ Update profile error:', error);
      return {
        success: false,
        message: error?.message || 'Failed to update profile'
      };
    }
  }, {
    body: t.Object({
      firstName: t.Optional(t.String()),
      lastName: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      address: t.Optional(t.String()),
      dateOfBirth: t.Optional(t.String()),
      emergencyContactName: t.Optional(t.String()),
      emergencyContactPhone: t.Optional(t.String()),
      socialSecurity: t.Optional(t.String()),
      avatar: t.Optional(t.String()),
      photoPath: t.Optional(t.String())
    })
  })

  // POST /api/profile/complete - Complete user profile (for new registrations)
  .post('/profile/complete', async ({ user, body }) => {
    console.log('🎯 COMPLETE PROFILE REQUEST: User=' + user?.userId, body);
    
    try {
      if (!user) {
        throw new Error('Authentication required');
      }

      // Update user profile with completion data including gender
      const [updatedUser] = await db.update(users)
        .set({
          phone: body.phone || undefined,
          address: body.address || undefined,
          dateOfBirth: body.dateOfBirth || undefined,
          gender: body.gender || undefined,
          emergencyContactName: body.emergencyContactName || undefined,
          emergencyContactPhone: body.emergencyContactPhone || undefined,
          socialSecurity: body.socialSecurity || undefined,
          avatar: body.avatar || undefined,
          profileCompleted: true, // Mark profile as completed
          updatedAt: new Date()
        })
        .where(eq(users.id, (user as any).userId))
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          address: users.address,
          dateOfBirth: users.dateOfBirth,
          gender: users.gender,
          emergencyContactName: users.emergencyContactName,
          emergencyContactPhone: users.emergencyContactPhone,
          socialSecurity: users.socialSecurity,
          role: users.role,
          position: users.position,
          isActive: users.isActive,
          profileCompleted: users.profileCompleted,
          approvalStatus: users.approvalStatus,
          avatar: users.avatar,
          photoPath: users.photoPath,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        });

      if (!updatedUser) {
        throw new Error('Failed to complete profile');
      }

      console.log(`✅ Profile completed for user: ${updatedUser?.firstName} ${updatedUser?.lastName}`);

      return {
        success: true,
        message: 'Profile completed successfully! Your application is pending admin approval.',
        data: updatedUser
      };

    } catch (error: any) {
      console.error('❌ Complete profile error:', error);
      return {
        success: false,
        message: error?.message || 'Failed to complete profile'
      };
    }
  }, {
    body: t.Object({
      phone: t.String(),
      address: t.String(),
      dateOfBirth: t.String(),
      gender: t.String(),
      emergencyContactName: t.String(),
      emergencyContactPhone: t.String(),
      socialSecurity: t.Optional(t.String()),
      avatar: t.Optional(t.String())
    })
  })

  // GET /api/profile/senior/{id} - Get senior profile by ID (for staff access)
  .get('/profile/senior/:id', async ({ user, params }) => {
    console.log(`👤 GET SENIOR PROFILE REQUEST: Staff=${user?.userId}, SeniorId=${params.id}`);
    
    try {
      if (!user) {
        throw new Error('Authentication required');
      }

      // Only allow staff and admin to access senior profiles
      if (user.role !== 'staff' && user.role !== 'admin') {
        throw new Error('Access denied: Staff or admin role required');
      }

      const seniorId = parseInt(params.id);
      if (isNaN(seniorId)) {
        throw new Error('Invalid senior ID');
      }

      const seniorProfile = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        address: users.address,
        dateOfBirth: users.dateOfBirth,
        gender: users.gender,
        emergencyContactName: users.emergencyContactName,
        emergencyContactPhone: users.emergencyContactPhone,
        socialSecurity: users.socialSecurity,
        role: users.role,
        isActive: users.isActive,
        profileCompleted: users.profileCompleted,
        approvalStatus: users.approvalStatus,
        avatar: users.avatar,
        photoPath: users.photoPath,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(eq(users.id, seniorId))
      .limit(1);

      if (!seniorProfile.length) {
        throw new Error('Senior not found');
      }

      // Ensure the user is a senior
      if (!seniorProfile[0] || seniorProfile[0].role !== 'senior') {
        throw new Error('User is not a senior');
      }

      console.log(`✅ Senior profile retrieved: ${seniorProfile[0]?.firstName} ${seniorProfile[0]?.lastName}`);

      return {
        success: true,
        message: 'Senior profile retrieved successfully',
        data: seniorProfile[0]
      };

    } catch (error: any) {
      console.error('❌ Get senior profile error:', error);
      return {
        success: false,
        message: error?.message || 'Failed to get senior profile'
      };
    }
  })

  // PUT /api/profile/avatar - Update user avatar
  .put('/profile/avatar', async ({ user, body }) => {
    console.log('🎨 UPDATE AVATAR REQUEST: User=' + user?.userId, body);
    
    try {
      if (!user) {
        throw new Error('Authentication required');
      }

      const [updatedUser] = await db.update(users)
        .set({
          avatar: body.avatar,
          photoPath: body.photoPath || null,
          updatedAt: new Date()
        })
        .where(eq(users.id, (user as any).userId))
        .returning({
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatar: users.avatar,
          photoPath: users.photoPath,
          updatedAt: users.updatedAt
        });

      if (!updatedUser) {
        throw new Error('Failed to update avatar');
      }

      console.log(`✅ Avatar updated for user: ${updatedUser?.firstName} ${updatedUser?.lastName} to ${updatedUser?.avatar}`);

      return {
        success: true,
        message: 'Avatar updated successfully',
        data: updatedUser
      };

    } catch (error: any) {
      console.error('❌ Update avatar error:', error);
      return {
        success: false,
        message: error?.message || 'Failed to update avatar'
      };
    }
  }, {
    body: t.Object({
      avatar: t.String(),
      photoPath: t.Optional(t.String())
    })
  });
