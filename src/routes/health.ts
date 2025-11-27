import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users, seniors, healthRecords, staffAssignments } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'office-seniors-super-secret-jwt-key-2024-change-this-in-production';

// Helper function to filter health record fields based on type
function filterHealthRecordFields(record: any) {
  // Minimal base fields that all health records need
  const baseFields = {
    id: record.id,
    seniorId: record.seniorId,
    seniorName: record.seniorName,
    seniorLastName: record.seniorLastName,
    type: record.type,
    title: record.title,
    status: record.status,
    createdAt: record.createdAt
  };

  // Add type-specific fields only - no unnecessary null fields
  switch (record.type) {
    case 'medication':
      const medicationFields: any = { ...baseFields };
      if (record.medicineName) medicationFields.medicineName = record.medicineName;
      if (record.dosage) medicationFields.dosage = record.dosage;
      if (record.frequency) medicationFields.frequency = record.frequency;
      if (record.refillDate) medicationFields.refillDate = record.refillDate;
      if (record.reminderTime) medicationFields.reminderTime = record.reminderTime;
      if (record.notes) medicationFields.notes = record.notes;
      return medicationFields;

    case 'appointment':
      const appointmentFields: any = { ...baseFields };
      if (record.doctorName) appointmentFields.doctorName = record.doctorName;
      if (record.location) appointmentFields.location = record.location;
      if (record.appointmentDate) appointmentFields.appointmentDate = record.appointmentDate;
      if (record.dateTime) appointmentFields.dateTime = record.dateTime;
      if (record.notes) appointmentFields.notes = record.notes;
      if (record.description) appointmentFields.description = record.description;
      return appointmentFields;

    case 'condition':
      const conditionFields: any = { ...baseFields };
      if (record.severity) conditionFields.severity = record.severity;
      if (record.diagnosedDate) conditionFields.diagnosedDate = record.diagnosedDate;
      if (record.treatment) conditionFields.treatment = record.treatment;
      if (record.description) conditionFields.description = record.description;
      if (record.notes) conditionFields.notes = record.notes;
      return conditionFields;

    case 'test':
      const testFields: any = { ...baseFields };
      if (record.testType) testFields.testType = record.testType;
      if (record.testResults) testFields.testResults = record.testResults;
      if (record.labFacility) testFields.labFacility = record.labFacility;
      if (record.testDate) testFields.testDate = record.testDate;
      if (record.notes) testFields.notes = record.notes;
      return testFields;

    case 'vaccination':
      const vaccinationFields: any = { ...baseFields };
      if (record.vaccineName) vaccinationFields.vaccineName = record.vaccineName;
      if (record.vaccinationDate) vaccinationFields.vaccinationDate = record.vaccinationDate;
      if (record.nextDueDate) vaccinationFields.nextDueDate = record.nextDueDate;
      if (record.vaccineProvider) vaccinationFields.vaccineProvider = record.vaccineProvider;
      if (record.notes) vaccinationFields.notes = record.notes;
      return vaccinationFields;

    case 'emergency':
      const emergencyFields: any = { ...baseFields };
      // Always include emergency contact fields, even if null/empty
      emergencyFields.contactName = record.contactName || null;
      emergencyFields.contactPhone = record.contactPhone || null;
      emergencyFields.relationship = record.relationship || null;
      
      console.log(`🔍 Emergency record filtering - ID: ${record.id}, contactName: "${record.contactName}", contactPhone: "${record.contactPhone}", relationship: "${record.relationship}"`);
      console.log(`📤 Filtered emergency fields:`, emergencyFields);
      
      return emergencyFields;

    case 'allergy':
      const allergyFields: any = { ...baseFields };
      if (record.allergen) allergyFields.allergen = record.allergen;
      if (record.reaction) allergyFields.reaction = record.reaction;
      if (record.allergySeverity) allergyFields.allergySeverity = record.allergySeverity;
      if (record.notes) allergyFields.notes = record.notes;
      return allergyFields;

    case 'exercise':
    case 'therapy':
      const exerciseFields: any = { ...baseFields };
      if (record.activityType) exerciseFields.activityType = record.activityType;
      if (record.duration) exerciseFields.duration = record.duration;
      if (record.exerciseFrequency) exerciseFields.exerciseFrequency = record.exerciseFrequency;
      if (record.therapist) exerciseFields.therapist = record.therapist;
      if (record.sessionDate) exerciseFields.sessionDate = record.sessionDate;
      if (record.notes) exerciseFields.notes = record.notes;
      // Include recurrence fields if they have values (regardless of isRecurring flag)
      if (record.recurrencePattern) exerciseFields.recurrencePattern = record.recurrencePattern;
      if (record.recurrenceTime) exerciseFields.recurrenceTime = record.recurrenceTime;
      if (record.startDate) exerciseFields.startDate = record.startDate;
      if (record.endDate) exerciseFields.endDate = record.endDate;
      if (record.recurrenceDays) exerciseFields.recurrenceDays = record.recurrenceDays;
      return exerciseFields;

    default:
      // For unknown types, return base fields only
      return baseFields;
  }
}

export const healthRoutes = new Elysia({ prefix: '/api/health' })
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
  
  // GET /api/health - Get all health records for current senior or staff's assigned seniors
  .get('/', async ({ user }) => {
    console.log(`🏥 GET HEALTH RECORDS REQUEST: User=${user?.userId}, Role=${user?.role}`);
    
    try {
      if (!user) {
        throw new Error('Authentication required');
      }
      
      let records;
      
      if (user.role === 'senior') {
        // Seniors can VIEW their own health records (read-only access)
        const seniorId = user.userId;

        // Get all health records for this senior
        records = await db.select({
          id: healthRecords.id,
          seniorId: healthRecords.seniorId,
          seniorName: users.firstName,
          seniorLastName: users.lastName,
          type: healthRecords.type,
          title: healthRecords.title,
          description: healthRecords.description,
          dateTime: healthRecords.dateTime,
          reminderTime: healthRecords.reminderTime,
          notes: healthRecords.notes,
          status: healthRecords.status,
          createdAt: healthRecords.createdAt,
          
          // Medication fields
          medicineName: healthRecords.medicineName,
          dosage: healthRecords.dosage,
          frequency: healthRecords.frequency,
          refillDate: healthRecords.refillDate,
          
          // Appointment fields
          doctorName: healthRecords.doctorName,
          location: healthRecords.location,
          appointmentDate: healthRecords.appointmentDate,
          
          // Condition fields
          severity: healthRecords.severity,
          diagnosedDate: healthRecords.diagnosedDate,
          treatment: healthRecords.treatment,
          
          // Test fields
          testType: healthRecords.testType,
          testResults: healthRecords.testResults,
          labFacility: healthRecords.labFacility,
          testDate: healthRecords.testDate,
          
          // Vaccination fields
          vaccineName: healthRecords.vaccineName,
          vaccinationDate: healthRecords.vaccinationDate,
          nextDueDate: healthRecords.nextDueDate,
          vaccineProvider: healthRecords.vaccineProvider,
          
          // Emergency Contact fields
          contactName: healthRecords.contactName,
          contactPhone: healthRecords.contactPhone,
          relationship: healthRecords.relationship,
          
          // Allergy fields
          allergen: healthRecords.allergen,
          reaction: healthRecords.reaction,
          allergySeverity: healthRecords.allergySeverity,
          
          // Exercise/therapy fields
          activityType: healthRecords.activityType,
          duration: healthRecords.duration,
          exerciseFrequency: healthRecords.exerciseFrequency,
          therapist: healthRecords.therapist,
          sessionDate: healthRecords.sessionDate,
          
          // Recurrence fields
          isRecurring: healthRecords.isRecurring,
          recurrencePattern: healthRecords.recurrencePattern,
          recurrenceTime: healthRecords.recurrenceTime,
          startDate: healthRecords.startDate,
          endDate: healthRecords.endDate,
          recurrenceDays: healthRecords.recurrenceDays
        })
      .from(healthRecords)
      .leftJoin(users, eq(healthRecords.seniorId, users.id))
      .where(eq(healthRecords.seniorId, seniorId))
      .orderBy(desc(healthRecords.dateTime));

        console.log(`✅ Found ${records.length} health records for senior ID: ${seniorId}`);
        
      } else if (user.role === 'staff') {
        // Staff can see health records for all their assigned seniors
        console.log(`👥 Staff ${user.userId} requesting health records for assigned seniors`);
        
        // Get all assigned seniors for this staff member
        const assignments = await db.select({
          seniorId: staffAssignments.seniorId
        })
        .from(staffAssignments)
        .where(eq(staffAssignments.staffId, user.userId));
        
        if (assignments.length === 0) {
          console.log(`📋 No assigned seniors found for staff ${user.userId}`);
          return {
            success: true,
            message: 'No assigned seniors found',
            data: []
          };
        }
        
        const seniorIds = assignments.map(a => a.seniorId);
        console.log(`👥 Staff assigned to seniors: ${seniorIds.join(', ')}`);
        
        // Get health records for all assigned seniors with senior names
        let allRecords = [];
        for (const seniorId of seniorIds) {
          const seniorRecords = await db.select({
            id: healthRecords.id,
            seniorId: healthRecords.seniorId,
            type: healthRecords.type,
            title: healthRecords.title,
            description: healthRecords.description,
            dateTime: healthRecords.dateTime,
            reminderTime: healthRecords.reminderTime,
            notes: healthRecords.notes,
            status: healthRecords.status,
            createdAt: healthRecords.createdAt,
            
            // Include senior name for grouping
            seniorName: users.firstName,
            seniorLastName: users.lastName,
            
            // Medication fields
            medicineName: healthRecords.medicineName,
            dosage: healthRecords.dosage,
            frequency: healthRecords.frequency,
            refillDate: healthRecords.refillDate,
            
            // Appointment fields
            doctorName: healthRecords.doctorName,
            location: healthRecords.location,
            appointmentDate: healthRecords.appointmentDate,
            
            // Condition fields
            severity: healthRecords.severity,
            diagnosedDate: healthRecords.diagnosedDate,
            treatment: healthRecords.treatment,
            
            // Test fields
            testType: healthRecords.testType,
            testResults: healthRecords.testResults,
            labFacility: healthRecords.labFacility,
            testDate: healthRecords.testDate,
            
            // Vaccination fields
            vaccineName: healthRecords.vaccineName,
            vaccinationDate: healthRecords.vaccinationDate,
            nextDueDate: healthRecords.nextDueDate,
            vaccineProvider: healthRecords.vaccineProvider,
            
            // Emergency Contact fields
            contactName: healthRecords.contactName,
            contactPhone: healthRecords.contactPhone,
            relationship: healthRecords.relationship,
            
            // Allergy fields
            allergen: healthRecords.allergen,
            reaction: healthRecords.reaction,
            allergySeverity: healthRecords.allergySeverity,
            
            // Exercise/therapy fields
            activityType: healthRecords.activityType,
            duration: healthRecords.duration,
            exerciseFrequency: healthRecords.exerciseFrequency,
            therapist: healthRecords.therapist,
            sessionDate: healthRecords.sessionDate,
            
            // Recurrence fields
            isRecurring: healthRecords.isRecurring,
            recurrencePattern: healthRecords.recurrencePattern,
            recurrenceTime: healthRecords.recurrenceTime,
            startDate: healthRecords.startDate,
            endDate: healthRecords.endDate,
            recurrenceDays: healthRecords.recurrenceDays
          })
          .from(healthRecords)
          .leftJoin(users, eq(healthRecords.seniorId, users.id))
          .where(eq(healthRecords.seniorId, seniorId))
          .orderBy(desc(healthRecords.dateTime));
          
          allRecords.push(...seniorRecords);
        }
        
        // Sort all records by dateTime
        records = allRecords.sort((a, b) => {
          const dateA = a.dateTime ? new Date(a.dateTime).getTime() : 0;
          const dateB = b.dateTime ? new Date(b.dateTime).getTime() : 0;
          return dateB - dateA;
        });
        
        console.log(`✅ Found ${records.length} health records for staff's assigned seniors`);
        
      } else {
        throw new Error('Only seniors and staff can access health records');
      }

      // Filter all records to remove null fields based on type
      const cleanedRecords = records.map(record => {
        console.log(`🔍 Raw record before filtering - ID: ${record.id}, seniorName: "${record.seniorName}", seniorLastName: "${record.seniorLastName}"`);
        return filterHealthRecordFields(record);
      });

      console.log(`📤 Sending ${cleanedRecords.length} cleaned records to frontend`);
      cleanedRecords.forEach(record => {
        console.log(`📋 Cleaned record - ID: ${record.id}, seniorName: "${record.seniorName}", seniorLastName: "${record.seniorLastName}"`);
      });

      return {
        success: true,
        message: 'Health records retrieved successfully',
        data: cleanedRecords
      };
    } catch (error) {
      console.error(`❌ Health records error:`, error);
      throw error;
    }
  })

  // GET /api/health/:id - Get single health record by ID
  .get('/:id', async ({ user, params }) => {
    const recordId = parseInt(params.id);
    console.log(`🏥 GET SINGLE HEALTH RECORD REQUEST: User=${user?.userId}, Role=${user?.role}, ID=${recordId}`);
    
    try {
      if (!user) {
        throw new Error('Authentication required');
      }
      
      let healthRecord;
      
      if (user.role === 'senior') {
        // Seniors can only see their own health records
        const [record] = await db.select()
          .from(healthRecords)
          .where(and(
            eq(healthRecords.id, recordId),
            eq(healthRecords.seniorId, user.userId)
          ))
          .limit(1);
          
        healthRecord = record;
        
      } else if (user.role === 'staff') {
        // Staff can see health records for their assigned seniors
        console.log(`👩‍⚕️ Staff ${user.userId} requesting health record ${recordId}`);
        
        // First, get the health record to find which senior it belongs to
        const [record] = await db.select()
          .from(healthRecords)
          .where(eq(healthRecords.id, recordId))
          .limit(1);
          
        if (!record) {
          return {
            success: false,
            message: 'Health record not found',
            data: null
          };
        }
        
        // Check if this staff member is assigned to this senior
        const [assignment] = await db.select()
          .from(staffAssignments)
          .where(and(
            eq(staffAssignments.staffId, user.userId),
            eq(staffAssignments.seniorId, record.seniorId),
            eq(staffAssignments.isActive, true)
          ))
          .limit(1);
          
        if (!assignment) {
          return {
            success: false,
            message: 'Access denied. You are not assigned to this senior.',
            data: null
          };
        }
        
        healthRecord = record;
        
      } else {
        throw new Error('Only seniors and staff can access health records');
      }
      
      if (!healthRecord) {
        return {
          success: false,
          message: 'Health record not found',
          data: null
        };
      }
      
      console.log(`✅ Health record found: ${healthRecord.title}`);
      console.log(`🔍 Health record fields for editing:`, {
        id: healthRecord.id,
        type: healthRecord.type,
        title: healthRecord.title,
        medicineName: healthRecord.medicineName,
        dosage: healthRecord.dosage,
        frequency: healthRecord.frequency,
        reminderTime: healthRecord.reminderTime,
        notes: healthRecord.notes,
        refillDate: healthRecord.refillDate
      });
      
      return {
        success: true,
        message: 'Health record retrieved successfully',
        data: healthRecord
      };
      
    } catch (error) {
      console.error(`❌ Get health record error:`, error);
      throw error;
    }
  })

  // POST /api/health - Create new health record
  .post('/', async ({ user, body }) => {
    console.log(`🏥 CREATE HEALTH RECORD REQUEST: User=${user?.userId}`);
    console.log(`🔍 Full request body:`, JSON.stringify(body, null, 2));
    console.log(`🔍 Body seniorId:`, body.seniorId);
    console.log(`🔍 Body keys:`, Object.keys(body));
    console.log(`🔍 Body type:`, body.type);
    console.log(`🔍 Emergency fields - contactName: "${body.contactName}", contactPhone: "${body.contactPhone}", relationship: "${body.relationship}"`);
    
    // Input data will be validated by Elysia schema
    
    try {
      if (!user) {
        throw new Error('Authentication required');
      }
      
      let seniorId;
      
      if (user.role === 'senior') {
        // Seniors can only VIEW health records, not create them
        throw new Error('Seniors can only view health records. Please contact your assigned staff member to add new records.');
        
      } else if (user.role === 'staff') {
        // Staff creating health record for assigned senior
        if (!body.seniorId) {
          throw new Error('Senior ID required for staff to create health records');
        }
        
        // Verify staff is assigned to this senior
        const assignment = await db.select()
          .from(staffAssignments)
          .where(
            and(
              eq(staffAssignments.staffId, user.userId),
              eq(staffAssignments.seniorId, body.seniorId),
              eq(staffAssignments.isActive, true)
            )
          )
          .limit(1);
          
        if (!assignment || assignment.length === 0) {
          throw new Error('Staff can only create health records for assigned seniors');
        }
        
        seniorId = body.seniorId;
        
      } else {
        throw new Error('Only seniors and staff can create health records');
      }

      // Create new health record with type-specific fields
      const recordData: any = {
        seniorId,
        type: body.type,
        title: body.title,
        description: body.description,
        dateTime: body.dateTime ? new Date(body.dateTime) : null,
        reminderTime: body.reminderTime,
        notes: body.notes,
        status: 'active'
      };

      // Add type-specific fields based on health record type
      switch (body.type.toLowerCase()) {
        case 'medication':
          recordData.medicineName = body.medicineName;
          recordData.dosage = body.dosage;
          recordData.frequency = body.frequency;
          // Handle refill date - convert to proper date format for PostgreSQL
          if (body.refillDate) {
            try {
              const refillDate = new Date(body.refillDate);
              recordData.refillDate = refillDate.toISOString().split('T')[0]; // YYYY-MM-DD format
              console.log(`🔍 Converted refillDate: "${body.refillDate}" -> "${recordData.refillDate}"`);
            } catch (error) {
              console.error('❌ Invalid refill date format:', body.refillDate);
              recordData.refillDate = null;
            }
          } else {
            recordData.refillDate = null;
          }
          break;
          
        case 'appointment':
          recordData.doctorName = body.doctorName;
          recordData.location = body.location;
          // Handle appointment date - convert to proper date format for PostgreSQL
          if (body.appointmentDate) {
            try {
              const appointmentDate = new Date(body.appointmentDate);
              recordData.appointmentDate = appointmentDate; // Keep as Date object for database
              console.log(`🔍 Converted appointmentDate: "${body.appointmentDate}" -> "${appointmentDate.toISOString()}"`);
            } catch (error) {
              console.error('❌ Invalid appointment date format:', body.appointmentDate);
              recordData.appointmentDate = null;
            }
          } else {
            recordData.appointmentDate = null;
          }
          break;
          
        case 'condition':
          recordData.severity = body.severity;
          // Handle diagnosed date - convert to proper date format for PostgreSQL
          if (body.diagnosedDate) {
            try {
              const diagnosedDate = new Date(body.diagnosedDate);
              recordData.diagnosedDate = diagnosedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
              console.log(`🔍 Converted diagnosedDate: "${body.diagnosedDate}" -> "${recordData.diagnosedDate}"`);
            } catch (error) {
              console.error('❌ Invalid diagnosed date format:', body.diagnosedDate);
              recordData.diagnosedDate = null;
            }
          } else {
            recordData.diagnosedDate = null;
          }
          recordData.treatment = body.treatment;
          break;
          
        case 'test':
          recordData.testType = body.testType;
          recordData.testResults = body.testResults;
          recordData.labFacility = body.labFacility;
          // Handle test date - convert to proper date format for PostgreSQL
          if (body.testDate) {
            try {
              const testDate = new Date(body.testDate);
              recordData.testDate = testDate.toISOString().split('T')[0]; // YYYY-MM-DD format
              console.log(`🔍 Converted testDate: "${body.testDate}" -> "${recordData.testDate}"`);
            } catch (error) {
              console.error('❌ Invalid test date format:', body.testDate);
              recordData.testDate = null;
            }
          } else {
            recordData.testDate = null;
          }
          break;
          
        case 'vaccination':
          recordData.vaccineName = body.vaccineName;
          // Handle vaccination date - convert to proper date format for PostgreSQL
          if (body.vaccinationDate) {
            try {
              const vaccinationDate = new Date(body.vaccinationDate);
              recordData.vaccinationDate = vaccinationDate.toISOString().split('T')[0]; // YYYY-MM-DD format
              console.log(`🔍 Converted vaccinationDate: "${body.vaccinationDate}" -> "${recordData.vaccinationDate}"`);
            } catch (error) {
              console.error('❌ Invalid vaccination date format:', body.vaccinationDate);
              recordData.vaccinationDate = null;
            }
          } else {
            recordData.vaccinationDate = null;
          }
          // Handle next due date - convert to proper date format for PostgreSQL
          if (body.nextDueDate) {
            try {
              const nextDueDate = new Date(body.nextDueDate);
              recordData.nextDueDate = nextDueDate.toISOString().split('T')[0]; // YYYY-MM-DD format
              console.log(`🔍 Converted nextDueDate: "${body.nextDueDate}" -> "${recordData.nextDueDate}"`);
            } catch (error) {
              console.error('❌ Invalid next due date format:', body.nextDueDate);
              recordData.nextDueDate = null;
            }
          } else {
            recordData.nextDueDate = null;
          }
          recordData.vaccineProvider = body.vaccineProvider;
          break;
          
        case 'emergency':
          recordData.contactName = body.contactName;
          recordData.contactPhone = body.contactPhone;
          recordData.relationship = body.relationship;
          break;
          
        case 'allergy':
          recordData.allergen = body.allergen;
          recordData.reaction = body.reaction;
          recordData.allergySeverity = body.allergySeverity;
          break;
          
        case 'exercise':
          recordData.activityType = body.activityType;
          recordData.duration = body.duration;
          recordData.exerciseFrequency = body.exerciseFrequency;
          recordData.therapist = body.therapist;
          // Handle session date - convert to proper date format for PostgreSQL
          if (body.sessionDate) {
            try {
              const sessionDate = new Date(body.sessionDate);
              recordData.sessionDate = sessionDate.toISOString().split('T')[0]; // YYYY-MM-DD format
              console.log(`🔍 Converted sessionDate: "${body.sessionDate}" -> "${recordData.sessionDate}"`);
            } catch (error) {
              console.error('❌ Invalid session date format:', body.sessionDate);
              recordData.sessionDate = null;
            }
          } else {
            recordData.sessionDate = null;
          }
          
          // Add recurrence fields for exercise/therapy
          recordData.isRecurring = body.isRecurring || false;
          recordData.recurrencePattern = body.recurrencePattern;
          recordData.recurrenceTime = body.recurrenceTime;
          // Handle start date - convert to proper date format for PostgreSQL
          if (body.startDate) {
            try {
              const startDate = new Date(body.startDate);
              recordData.startDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
              console.log(`🔍 Converted startDate: "${body.startDate}" -> "${recordData.startDate}"`);
            } catch (error) {
              console.error('❌ Invalid start date format:', body.startDate);
              recordData.startDate = null;
            }
          } else {
            recordData.startDate = null;
          }
          // Handle end date - convert to proper date format for PostgreSQL
          if (body.endDate) {
            try {
              const endDate = new Date(body.endDate);
              recordData.endDate = endDate.toISOString().split('T')[0]; // YYYY-MM-DD format
              console.log(`🔍 Converted endDate: "${body.endDate}" -> "${recordData.endDate}"`);
            } catch (error) {
              console.error('❌ Invalid end date format:', body.endDate);
              recordData.endDate = null;
            }
          } else {
            recordData.endDate = null;
          }
          recordData.recurrenceDays = body.recurrenceDays;
          break;
      }

      const [newRecord] = await db.insert(healthRecords)
        .values(recordData)
        .returning();

      if (!newRecord) {
        throw new Error('Failed to create health record');
      }

      // Get the senior's name information by joining with users table
      const [recordWithSeniorInfo] = await db.select({
        id: healthRecords.id,
        seniorId: healthRecords.seniorId,
        seniorName: users.firstName,
        seniorLastName: users.lastName,
        type: healthRecords.type,
        title: healthRecords.title,
        description: healthRecords.description,
        dateTime: healthRecords.dateTime,
        reminderTime: healthRecords.reminderTime,
        notes: healthRecords.notes,
        status: healthRecords.status,
        createdAt: healthRecords.createdAt,
        
        // Medication fields
        medicineName: healthRecords.medicineName,
        dosage: healthRecords.dosage,
        frequency: healthRecords.frequency,
        refillDate: healthRecords.refillDate,
        
        // Appointment fields
        doctorName: healthRecords.doctorName,
        location: healthRecords.location,
        appointmentDate: healthRecords.appointmentDate,
        
        // Condition fields
        severity: healthRecords.severity,
        diagnosedDate: healthRecords.diagnosedDate,
        treatment: healthRecords.treatment,
        
        // Test fields
        testType: healthRecords.testType,
        testResults: healthRecords.testResults,
        labFacility: healthRecords.labFacility,
        testDate: healthRecords.testDate,
        
        // Vaccination fields
        vaccineName: healthRecords.vaccineName,
        vaccinationDate: healthRecords.vaccinationDate,
        nextDueDate: healthRecords.nextDueDate,
        vaccineProvider: healthRecords.vaccineProvider,
        
        // Emergency Contact fields
        contactName: healthRecords.contactName,
        contactPhone: healthRecords.contactPhone,
        relationship: healthRecords.relationship,
        
        // Allergy fields
        allergen: healthRecords.allergen,
        reaction: healthRecords.reaction,
        allergySeverity: healthRecords.allergySeverity,
        
        // Exercise/therapy fields
        activityType: healthRecords.activityType,
        duration: healthRecords.duration,
        exerciseFrequency: healthRecords.exerciseFrequency,
        therapist: healthRecords.therapist,
        sessionDate: healthRecords.sessionDate,
        
        // Recurrence fields
        isRecurring: healthRecords.isRecurring,
        recurrencePattern: healthRecords.recurrencePattern,
        recurrenceTime: healthRecords.recurrenceTime,
        startDate: healthRecords.startDate,
        endDate: healthRecords.endDate,
        recurrenceDays: healthRecords.recurrenceDays
      })
      .from(healthRecords)
      .leftJoin(users, eq(healthRecords.seniorId, users.id))
      .where(eq(healthRecords.id, newRecord.id));

      // Filter the created record to remove null fields
      const cleanedRecord = filterHealthRecordFields(recordWithSeniorInfo);
      
      console.log(`✅ Health record created successfully:`, cleanedRecord);

      return {
        success: true,
        message: 'Health record created successfully',
        data: cleanedRecord // Return single object for HealthRecordResponse format
      };
    } catch (error) {
      console.error(`❌ Create health record error:`, error);
      throw error;
    }
  }, {
    body: t.Object({
      type: t.String({ minLength: 1 }), // medication, appointment, condition, etc.
      title: t.String({ minLength: 1 }),
      description: t.Optional(t.String()),
      dateTime: t.Optional(t.String()), // ISO date string
      reminderTime: t.Optional(t.String()), // HH:MM format
      notes: t.Optional(t.String()),
      seniorId: t.Optional(t.Number()), // Add seniorId for staff users
      
      // Medication fields
      medicineName: t.Optional(t.String()),
      dosage: t.Optional(t.String()),
      frequency: t.Optional(t.String()),
      refillDate: t.Optional(t.String()),
      
      // Appointment fields
      doctorName: t.Optional(t.String()),
      location: t.Optional(t.String()),
      appointmentDate: t.Optional(t.String()),
      
      // Condition fields
      severity: t.Optional(t.String()),
      diagnosedDate: t.Optional(t.String()),
      treatment: t.Optional(t.String()),
      
      // Test fields
      testType: t.Optional(t.String()),
      testResults: t.Optional(t.String()),
      labFacility: t.Optional(t.String()),
      testDate: t.Optional(t.String()),
      
      // Vaccination fields
      vaccineName: t.Optional(t.String()),
      vaccinationDate: t.Optional(t.String()),
      nextDueDate: t.Optional(t.String()),
      vaccineProvider: t.Optional(t.String()),
      
      // Emergency contact fields
      contactName: t.Optional(t.String()),
      contactPhone: t.Optional(t.String()),
      relationship: t.Optional(t.String()),
      
      // Allergy fields
      allergen: t.Optional(t.String()),
      reaction: t.Optional(t.String()),
      allergySeverity: t.Optional(t.String()),
      
      // Exercise/therapy fields
      activityType: t.Optional(t.String()),
      duration: t.Optional(t.String()),
      exerciseFrequency: t.Optional(t.String()),
      therapist: t.Optional(t.String()),
      sessionDate: t.Optional(t.String()),
      
      // Recurrence fields
      isRecurring: t.Optional(t.Boolean()),
      recurrencePattern: t.Optional(t.String()),
      recurrenceTime: t.Optional(t.String()),
      startDate: t.Optional(t.String()),
      endDate: t.Optional(t.String()),
      recurrenceDays: t.Optional(t.String())
    })
  })

  // PUT /api/health/:id - Update health record
  .put('/:id', async ({ user, params, body }) => {
    console.log(`🏥 UPDATE HEALTH RECORD REQUEST: User=${user?.userId}, ID=${params.id}`, body);
    
    try {
      const recordId = parseInt(params.id);
      let seniorId;

      if (user.role === 'senior') {
        // Seniors can only VIEW health records, not update them
        throw new Error('Seniors can only view health records. Please contact your assigned staff member to make updates.');
      } else if (user.role === 'staff') {
        // Staff can update health records for their assigned seniors
        if (!body.seniorId) {
          throw new Error('Senior ID is required for staff to update health records');
        }
        
        console.log(`👥 Staff ${user.userId} attempting to update health record for senior ${body.seniorId}`);
        
        // Verify that this senior is assigned to this staff member
        const assignment = await db.select()
          .from(staffAssignments)
          .where(and(
            eq(staffAssignments.staffId, user.userId),
            eq(staffAssignments.seniorId, body.seniorId),
            eq(staffAssignments.isActive, true)
          ))
          .limit(1);

        if (assignment.length === 0) {
          throw new Error('You can only update health records for seniors assigned to you');
        }

        seniorId = body.seniorId;
        console.log(`✅ Staff ${user.userId} authorized to update health record for senior ${seniorId}`);
      } else {
        throw new Error('Only seniors and staff can update health records');
      }

      // Update health record (only if it belongs to this senior)
      const [updatedRecord] = await db.update(healthRecords)
        .set({
          type: body.type,
          title: body.title,
          description: body.description,
          dateTime: body.dateTime ? new Date(body.dateTime) : null,
          reminderTime: body.reminderTime,
          notes: body.notes,
          status: body.status
        })
        .where(and(
          eq(healthRecords.id, recordId),
          eq(healthRecords.seniorId, seniorId)
        ))
        .returning();

      if (!updatedRecord) {
        throw new Error('Health record not found or access denied');
      }

      // Filter the updated record to remove null fields
      const cleanedRecord = filterHealthRecordFields(updatedRecord);
      
      console.log(`✅ Health record updated successfully:`, cleanedRecord);

      return {
        success: true,
        message: 'Health record updated successfully',
        data: [cleanedRecord] // Wrap in array to match Android HealthRecordsResponse format
      };
    } catch (error) {
      console.error(`❌ Update health record error:`, error);
      throw error;
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      type: t.String({ minLength: 1 }),
      title: t.String({ minLength: 1 }),
      description: t.Optional(t.String()),
      dateTime: t.Optional(t.String()),
      reminderTime: t.Optional(t.String()),
      notes: t.Optional(t.String()),
      status: t.Optional(t.String()),
      seniorId: t.Number() // Required seniorId for staff users
    })
  })

  // DELETE /api/health/:id - Delete health record
  .delete('/:id', async ({ user, params }) => {
    console.log(`🏥 DELETE HEALTH RECORD REQUEST: User=${user?.userId}, Role=${user?.role}, ID=${params.id}`);
    
    try {
      const recordId = parseInt(params.id);

      if (user.role === 'senior') {
        // Seniors can only VIEW health records, not delete them
        throw new Error('Seniors can only view health records. Please contact your assigned staff member to make changes.');

      } else if (user.role === 'staff') {
        // Staff can delete health records for their assigned seniors
        console.log(`👩‍⚕️ Staff ${user.userId} attempting to delete health record ${recordId}`);

        // First, get the health record to find which senior it belongs to
        const [healthRecord] = await db.select({
          id: healthRecords.id,
          seniorId: healthRecords.seniorId
        })
        .from(healthRecords)
        .where(eq(healthRecords.id, recordId))
        .limit(1);

        if (!healthRecord) {
          console.log(`❌ Health record ${recordId} not found - may have been already deleted`);
          return {
            success: false,
            message: 'Health record not found or already deleted',
            data: null
          };
        }

        // Check if this staff member is assigned to this senior
        const [assignment] = await db.select()
          .from(staffAssignments)
          .where(and(
            eq(staffAssignments.staffId, user.userId),
            eq(staffAssignments.seniorId, healthRecord.seniorId),
            eq(staffAssignments.isActive, true)
          ))
          .limit(1);

        if (!assignment) {
          throw new Error('Access denied. You are not assigned to this senior.');
        }

        // Delete the health record
        const [deletedRecord] = await db.delete(healthRecords)
          .where(eq(healthRecords.id, recordId))
          .returning();

        if (!deletedRecord) {
          throw new Error('Health record not found or access denied');
        }

        // Filter fields based on health record type to avoid null pollution
        const cleanedRecord = filterHealthRecordFields(deletedRecord);
        
        console.log(`✅ Staff deleted health record:`, cleanedRecord);
        
        const response = {
          success: true,
          message: 'Health record deleted successfully',
          data: [cleanedRecord] // Wrap in array to match Android HealthRecordsResponse format
        };
        
        console.log(`📤 DELETE Response being sent:`, response);
        return response;

      } else {
        throw new Error('Access denied. Only seniors and assigned staff can delete health records.');
      }

    } catch (error) {
      console.error(`❌ Delete health record error:`, error);
      throw error;
    }
  }, {
    params: t.Object({
      id: t.String()
    })
  })

  // GET /api/health/types - Get available health record types
  .get('/types', async () => {
    const types = [
      { id: 'medication', name: 'Medication', icon: '💊', description: 'Daily medications and prescriptions' },
      { id: 'appointment', name: 'Medical Appointment', icon: '🏥', description: 'Doctor visits and medical appointments' },
      { id: 'condition', name: 'Health Condition', icon: '🩺', description: 'Chronic conditions and diagnoses' },
      { id: 'test', name: 'Medical Test', icon: '🧪', description: 'Lab results and medical tests' },
      { id: 'vaccination', name: 'Vaccination', icon: '💉', description: 'Immunizations and vaccines' },
      { id: 'emergency', name: 'Emergency Contact', icon: '🚨', description: 'Emergency medical information' },
      { id: 'allergy', name: 'Allergy', icon: '⚠️', description: 'Food and medication allergies' },
      { id: 'exercise', name: 'Exercise/Therapy', icon: '🏃‍♂️', description: 'Physical therapy and exercise routines' }
    ];

    return {
      success: true,
      message: 'Health record types retrieved successfully',
      data: types
    };
  });