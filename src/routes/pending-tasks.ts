import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users, staffAssignments } from '../db/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'office-seniors-super-secret-jwt-key-2024-change-this-in-production';

console.log('🔥 PENDING TASKS ROUTES LOADED');

export const pendingTasksRoutes = new Elysia({ prefix: '/api/staff' })
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
  
  .get('/pending-tasks', async ({ user }) => {
    try {
      console.log(`📋 Pending tasks requested by staff ID: ${user.userId}`);
      
      // Verify user is staff
      if (user.role !== 'staff') {
        return {
          success: false,
          message: 'Access denied. Staff role required.'
        };
      }

      // Get staff's assigned seniors
      const assignedSeniors = await db
        .select({
          seniorId: users.id,
          seniorName: users.firstName,
          seniorLastName: users.lastName,
          seniorEmail: users.email,
          seniorPhone: users.phone,
          seniorAddress: users.address,
          seniorEmergencyContactName: users.emergencyContactName,
          seniorEmergencyContactPhone: users.emergencyContactPhone,
          assignedAt: staffAssignments.assignedAt
        })
        .from(staffAssignments)
        .innerJoin(users, eq(staffAssignments.seniorId, users.id))
        .where(
          and(
            eq(staffAssignments.staffId, user.userId),
            eq(staffAssignments.isActive, true),
            eq(users.isActive, true),
            eq(users.role, 'senior')
          )
        );

      console.log(`👥 Found ${assignedSeniors.length} assigned seniors`);

      // Generate pending tasks based on missing/incomplete information
      const pendingTasks = [];
      let taskIdCounter = 1;

      for (const senior of assignedSeniors) {
        const seniorFullName = `${senior.seniorName} ${senior.seniorLastName}`;
        
        // Task 1: Missing phone number
        if (!senior.seniorPhone) {
          pendingTasks.push({
            id: `task_${taskIdCounter++}`,
            type: 'incomplete_profile',
            title: 'Missing Phone Number',
            description: 'Senior needs to provide a contact phone number',
            priority: 'high',
            seniorId: senior.seniorId,
            seniorName: seniorFullName,
            category: 'Profile',
            dueDate: null,
            createdAt: new Date()
          });
        }

        // Task 2: Missing address
        if (!senior.seniorAddress) {
          pendingTasks.push({
            id: `task_${taskIdCounter++}`,
            type: 'incomplete_profile',
            title: 'Missing Address Information',
            description: 'Senior needs to provide their residential address',
            priority: 'high',
            seniorId: senior.seniorId,
            seniorName: seniorFullName,
            category: 'Profile',
            dueDate: null,
            createdAt: new Date()
          });
        }

        // Task 3: Missing emergency contact
        console.log(`🔍 Checking emergency contact for ${seniorFullName}:`, {
          emergencyContactName: senior.seniorEmergencyContactName,
          emergencyContactPhone: senior.seniorEmergencyContactPhone
        });
        
        if (!senior.seniorEmergencyContactName || !senior.seniorEmergencyContactPhone) {
          console.log(`⚠️ Missing emergency contact for ${seniorFullName}`);
          pendingTasks.push({
            id: `task_${taskIdCounter++}`,
            type: 'missing_emergency_contact',
            title: 'Missing Emergency Contact',
            description: 'Senior needs to provide emergency contact information',
            priority: 'high',
            seniorId: senior.seniorId,
            seniorName: seniorFullName,
            category: 'Safety',
            dueDate: null,
            createdAt: new Date()
          });
        } else {
          console.log(`✅ Emergency contact exists for ${seniorFullName}`);
        }

        // Task 4: Health record follow-up (example task)
        const assignedDate = senior.assignedAt ? new Date(senior.assignedAt) : new Date();
        const daysSinceAssignment = Math.floor((new Date().getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceAssignment > 7) {
          pendingTasks.push({
            id: `task_${taskIdCounter++}`,
            type: 'overdue_health_record',
            title: 'Health Record Review Due',
            description: 'Senior needs a health record review and update',
            priority: 'medium',
            seniorId: senior.seniorId,
            seniorName: seniorFullName,
            category: 'Health',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            createdAt: new Date()
          });
        }

        // Task 5: Medication review (for all staff)
        if (daysSinceAssignment > 14) {
          pendingTasks.push({
            id: `task_${taskIdCounter++}`,
            type: 'medication_review',
            title: 'Medication Review Required',
            description: 'Senior needs a comprehensive medication review',
            priority: 'medium',
            seniorId: senior.seniorId,
            seniorName: seniorFullName,
            category: 'Health',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            createdAt: new Date()
          });
        }
      }

      // Sort tasks by priority (high first) and creation date
      const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
      pendingTasks.sort((a, b) => {
        const priorityDiff = (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      console.log(`✅ Generated ${pendingTasks.length} pending tasks for staff ${user.firstName} ${user.lastName}`);
      console.log(`📋 Task breakdown:`, {
        high: pendingTasks.filter(t => t.priority === 'high').length,
        medium: pendingTasks.filter(t => t.priority === 'medium').length,
        low: pendingTasks.filter(t => t.priority === 'low').length
      });

      return {
        success: true,
        tasks: pendingTasks,
        totalCount: pendingTasks.length,
        summary: {
          highPriority: pendingTasks.filter(t => t.priority === 'high').length,
          mediumPriority: pendingTasks.filter(t => t.priority === 'medium').length,
          lowPriority: pendingTasks.filter(t => t.priority === 'low').length,
          categories: {
            profile: pendingTasks.filter(t => t.category === 'Profile').length,
            health: pendingTasks.filter(t => t.category === 'Health').length,
            safety: pendingTasks.filter(t => t.category === 'Safety').length
          }
        }
      };
      
    } catch (error) {
      console.error('❌ Error fetching pending tasks:', error);
      return {
        success: false,
        message: 'Failed to fetch pending tasks',
        tasks: [],
        totalCount: 0
      };
    }
  });
