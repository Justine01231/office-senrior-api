# Benefits Specialist Dashboard - API Testing Guide

**Date:** 2025-11-25  
**Server:** http://0.0.0.0:8000  
**Base URL:** http://0.0.0.0:8000/api/benefits

---

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

To get a token, login first:
```bash
POST http://0.0.0.0:8000/api/auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

---

## New Endpoints Testing

### 1. Get Single Application Details ✨ NEW

**Endpoint:** `GET /api/benefits/applications/:id`

**Example:**
```bash
curl -X GET \
  http://0.0.0.0:8000/api/benefits/applications/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "seniorId": 2,
    "seniorName": "John Doe",
    "seniorEmail": "john@example.com",
    "seniorPhone": "555-0100",
    "applicationType": "SNAP Benefits",
    "applicationDate": "2024-11-01",
    "status": "approved",
    "statusUpdatedAt": "2024-11-05T10:00:00Z",
    "statusReason": "Approved for food assistance program",
    "priority": "high",
    "estimatedAmount": "$200/month",
    "notes": "Approved for food assistance program",
    "assignedTo": null,
    "createdAt": "2024-11-01T09:00:00Z",
    "updatedAt": "2024-11-05T10:00:00Z",
    "totalDocumentsCount": 3,
    "submittedDocumentsCount": 2,
    "completionPercentage": 67
  }
}
```

**Test Cases:**
- ✅ Valid application ID → Returns application with completion %
- ✅ Invalid ID → Returns 404 error
- ✅ completionPercentage correctly calculated
- ✅ completionPercentage = 0 when no documents

---

### 2. Delete Application ✨ NEW

**Endpoint:** `DELETE /api/benefits/applications/:id`

**Example:**
```bash
curl -X DELETE \
  http://0.0.0.0:8000/api/benefits/applications/5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Benefit application deleted",
  "data": {
    "id": 5,
    "seniorId": 2,
    "applicationType": "SNAP Benefits",
    "status": "rejected"
  }
}
```

**Test Cases:**
- ✅ Valid application ID → Deletes successfully
- ✅ Invalid ID → Returns 404 error
- ✅ No auth token → Returns 401 error
- ✅ Related documents/history also deleted (CASCADE)

**WARNING:** This is a destructive operation. Test with sample data only!

---

### 3. Get My Assigned Seniors ✨ NEW

**Endpoint:** `GET /api/benefits/my-seniors`

**Example:**
```bash
curl -X GET \
  http://0.0.0.0:8000/api/benefits/my-seniors \
  -H "Authorization: Bearer BENEFITS_SPECIALIST_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "seniorId": 2,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "555-0100",
      "address": "123 Main St",
      "dateOfBirth": "1950-01-15",
      "assignedAt": "2024-10-01T09:00:00Z",
      "assignmentId": 5,
      "statistics": {
        "pendingApplications": 2,
        "totalApplications": 5
      }
    }
  ],
  "count": 1
}
```

**Test Cases:**
- ✅ Benefits Specialist user → Returns assigned seniors
- ✅ Non-staff user → Returns access denied
- ✅ Staff with no assignments → Returns empty array
- ✅ Statistics correctly calculated

---

### 4. Get Recent Benefits Activity ✨ NEW

**Endpoint:** `GET /api/benefits/recent-activity?limit=10`

**Example:**
```bash
curl -X GET \
  "http://0.0.0.0:8000/api/benefits/recent-activity?limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "status_15",
        "type": "status_change",
        "title": "Status Updated: pending → approved",
        "description": "Application meets all requirements",
        "seniorName": "John Doe",
        "staffName": "Jane Smith",
        "applicationType": "Medicare",
        "applicationId": 2,
        "createdAt": "2024-11-25T14:30:00Z",
        "timeAgo": "2 hours ago",
        "icon": "🔄",
        "color": "success"
      },
      {
        "id": "doc_42",
        "type": "document_upload",
        "title": "Document Uploaded: Income Statement",
        "description": "Income_Proof - submitted",
        "seniorName": "Jane Doe",
        "staffName": "John Staff",
        "applicationType": "SNAP Benefits",
        "applicationId": 1,
        "createdAt": "2024-11-25T13:15:00Z",
        "timeAgo": "3 hours ago",
        "icon": "📄",
        "color": "info"
      }
    ]
  },
  "count": 2
}
```

**Test Cases:**
- ✅ Default limit (10) → Returns up to 10 activities
- ✅ Custom limit → Respects limit parameter
- ✅ Multiple activity types combined
- ✅ Sorted by most recent first
- ✅ Time ago correctly calculated
- ✅ Icons and colors assigned correctly

---

### 5. Get Dashboard Statistics ✨ NEW

**Endpoint:** `GET /api/benefits/dashboard/stats`

**Example:**
```bash
curl -X GET \
  http://0.0.0.0:8000/api/benefits/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalApplications": 25,
      "pendingApplications": 8,
      "approvedApplications": 12,
      "rejectedApplications": 3,
      "underReviewApplications": 2,
      "approvalRate": 48
    },
    "byStatus": [
      { "status": "pending", "count": 8 },
      { "status": "approved", "count": 12 },
      { "status": "rejected", "count": 3 },
      { "status": "under_review", "count": 2 }
    ],
    "byType": [
      { "applicationType": "SNAP Benefits", "count": 10 },
      { "applicationType": "Medicare", "count": 8 },
      { "applicationType": "Housing Assistance", "count": 7 }
    ],
    "byPriority": [
      { "priority": "high", "count": 6 },
      { "priority": "medium", "count": 14 },
      { "priority": "low", "count": 5 }
    ],
    "myStats": {
      "assignedSeniors": 5,
      "pendingApplications": 3
    }
  }
}
```

**Test Cases:**
- ✅ Returns all overview statistics
- ✅ Breakdown by status, type, priority
- ✅ myStats only for staff users
- ✅ myStats = null for non-staff users
- ✅ Approval rate correctly calculated

---

## Enhanced Endpoints Testing

### 6. Get Benefits with Filters ✨ ENHANCED

**Endpoint:** `GET /api/benefits?benefitType={type}&status={status}`

**Example 1: Filter by Type**
```bash
curl -X GET \
  "http://0.0.0.0:8000/api/benefits?benefitType=Medicare" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example 2: Filter by Status**
```bash
curl -X GET \
  "http://0.0.0.0:8000/api/benefits?status=active" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example 3: Filter by Both**
```bash
curl -X GET \
  "http://0.0.0.0:8000/api/benefits?benefitType=Medicare&status=active" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Test Cases:**
- ✅ Filter by type only
- ✅ Filter by status only
- ✅ Filter by both type and status
- ✅ Use "all" to show everything
- ✅ Invalid type/status returns empty array

---

### 7. Get Applications with Completion % ✨ FIXED

**Endpoint:** `GET /api/benefits/applications`

**Example:**
```bash
curl -X GET \
  "http://0.0.0.0:8000/api/benefits/applications?status=pending&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "seniorId": 3,
      "seniorName": "Jane Smith",
      "applicationType": "Medicare",
      "applicationDate": "2024-11-05",
      "status": "pending",
      "priority": "medium",
      "totalDocumentsCount": 2,
      "submittedDocumentsCount": 1,
      "completionPercentage": 50
    },
    {
      "id": 4,
      "seniorId": 2,
      "seniorName": "John Doe",
      "applicationType": "Medicaid",
      "applicationDate": "2024-11-15",
      "status": "pending",
      "priority": "medium",
      "totalDocumentsCount": 0,
      "submittedDocumentsCount": 0,
      "completionPercentage": 0
    }
  ],
  "count": 2
}
```

**Test Cases:**
- ✅ completionPercentage = 0 when totalDocumentsCount = 0
- ✅ completionPercentage calculated correctly (submitted/total * 100)
- ✅ No more "NaN" or stuck at 100%
- ✅ Handles NULL submittedDocumentsCount

---

### 8. Get Reports with Real Processing Time ✨ FIXED

**Endpoint:** `GET /api/benefits/reports?period={period}`

**Example 1: This Month**
```bash
curl -X GET \
  "http://0.0.0.0:8000/api/benefits/reports?period=this_month" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example 2: Custom Date Range**
```bash
curl -X GET \
  "http://0.0.0.0:8000/api/benefits/reports?period=custom&startDate=2024-11-01&endDate=2024-11-25" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "days": 30,
      "startDate": "2024-10-26",
      "endDate": "2024-11-25"
    },
    "overview": {
      "totalApplications": 15,
      "byStatus": [
        { "status": "pending", "count": 5 },
        { "status": "approved", "count": 8 },
        { "status": "rejected", "count": 2 }
      ],
      "approvalRate": 53.3
    },
    "breakdown": {
      "byType": [
        { "applicationType": "SNAP Benefits", "count": 6 },
        { "applicationType": "Medicare", "count": 5 },
        { "applicationType": "Housing Assistance", "count": 4 }
      ]
    },
    "performance": {
      "approvalRate": 53.3,
      "avgProcessingDays": 14
    }
  }
}
```

**Test Cases:**
- ✅ avgProcessingDays is real number (not placeholder 12)
- ✅ avgProcessingDays = 0 when no completed applications
- ✅ Only counts approved/rejected applications
- ✅ Calculates days between creation and status update
- ✅ Period filters work correctly

---

## Existing Endpoints (Already Working)

### 9. Create Application
```bash
POST http://0.0.0.0:8000/api/benefits/applications
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "seniorId": "2",
  "applicationType": "Medicare",
  "applicationDate": "2024-11-25",
  "status": "pending",
  "priority": "high",
  "estimatedAmount": "$200/month",
  "notes": "Medical coverage needed"
}
```

### 10. Update Application Status
```bash
PUT http://0.0.0.0:8000/api/benefits/applications/2/status
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "newStatus": "approved",
  "reason": "All documents verified and approved"
}
```

### 11. Get Application Documents
```bash
GET http://0.0.0.0:8000/api/benefits/applications/2/documents
Authorization: Bearer YOUR_TOKEN
```

### 12. Upload Document
```bash
POST http://0.0.0.0:8000/api/benefits/applications/2/documents
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "seniorId": "2",
  "name": "Social Security Card",
  "description": "Copy of SS card",
  "documentType": "ID",
  "status": "submitted",
  "fileName": "ss-card.pdf",
  "filePath": "/uploads/ss-card.pdf",
  "fileSize": "102400",
  "mimeType": "application/pdf"
}
```

### 13. Get Status History
```bash
GET http://0.0.0.0:8000/api/benefits/applications/2/history
Authorization: Bearer YOUR_TOKEN
```

---

## Testing Workflow

### Step-by-Step Test Flow:

#### 1. Login and Get Token
```bash
POST /api/auth/login
{
  "username": "benefits_specialist",
  "password": "your_password"
}
```

#### 2. Get Dashboard Statistics
```bash
GET /api/benefits/dashboard/stats
```
- Verify overview numbers
- Check byStatus, byType, byPriority
- Verify myStats for staff users

#### 3. Get My Assigned Seniors
```bash
GET /api/benefits/my-seniors
```
- Verify seniors list
- Check statistics per senior
- Verify pending applications count

#### 4. Get Recent Activity
```bash
GET /api/benefits/recent-activity?limit=10
```
- Verify activity types (status_change, document_upload, new_application)
- Check time ago calculation
- Verify icons and colors

#### 5. Get Applications with Filters
```bash
GET /api/benefits/applications?status=pending&priority=high
```
- Verify completionPercentage field exists
- Check that 0% shows for no documents
- Verify filters work correctly

#### 6. Get Single Application
```bash
GET /api/benefits/applications/1
```
- Verify full details returned
- Check completionPercentage calculation
- Verify senior information included

#### 7. Create Test Application
```bash
POST /api/benefits/applications
{
  "seniorId": "2",
  "applicationType": "Test Application",
  "applicationDate": "2024-11-25",
  "priority": "medium"
}
```

#### 8. Update Application Status
```bash
PUT /api/benefits/applications/{id}/status
{
  "newStatus": "approved",
  "reason": "Test approval"
}
```

#### 9. Delete Test Application
```bash
DELETE /api/benefits/applications/{id}
```

#### 10. Get Reports
```bash
GET /api/benefits/reports?period=this_month
```
- Verify avgProcessingDays is real (not 12)
- Check approval rate calculation
- Verify breakdown by type

---

## Common Test Scenarios

### Scenario 1: New Application Flow
1. Create new application → `POST /api/benefits/applications`
2. Verify it appears in list → `GET /api/benefits/applications`
3. Check recent activity → `GET /api/benefits/recent-activity`
4. Verify completionPercentage = 0 (no documents yet)

### Scenario 2: Document Upload Flow
1. Upload document → `POST /api/benefits/applications/:id/documents`
2. Get application details → `GET /api/benefits/applications/:id`
3. Verify completionPercentage updated
4. Check recent activity shows upload

### Scenario 3: Status Change Flow
1. Update status → `PUT /api/benefits/applications/:id/status`
2. Check status history → `GET /api/benefits/applications/:id/history`
3. Verify recent activity shows status change
4. Check dashboard stats updated

### Scenario 4: Filtering Flow
1. Get all applications → `GET /api/benefits/applications`
2. Filter by status → `GET /api/benefits/applications?status=pending`
3. Filter by type → `GET /api/benefits/applications?applicationType=Medicare`
4. Filter by both → `GET /api/benefits/applications?status=pending&applicationType=Medicare`

---

## Error Testing

### Test Invalid Requests:

#### 1. Missing Authentication
```bash
GET /api/benefits/dashboard/stats
# No Authorization header
```
**Expected:** 401 Unauthorized

#### 2. Invalid Application ID
```bash
GET /api/benefits/applications/99999
```
**Expected:** 404 Not Found or error message

#### 3. Invalid Status Value
```bash
PUT /api/benefits/applications/1/status
{
  "newStatus": "invalid_status"
}
```
**Expected:** Application accepts (no validation on status values)

#### 4. Delete Non-existent Application
```bash
DELETE /api/benefits/applications/99999
```
**Expected:** 404 Not Found or error message

#### 5. Access Denied (Non-staff user)
```bash
# Login as senior user, then try:
GET /api/benefits/my-seniors
```
**Expected:** Access denied error

---

## Performance Testing

### Load Test Queries:

#### 1. Large Dataset Query
```bash
GET /api/benefits/applications?limit=100
```
- Measure response time
- Should be < 500ms

#### 2. Complex Aggregation
```bash
GET /api/benefits/dashboard/stats
```
- Multiple COUNT queries
- Should be < 1000ms

#### 3. Recent Activity (Heavy Query)
```bash
GET /api/benefits/recent-activity?limit=50
```
- Joins multiple tables
- Should be < 1500ms

---

## Database State Verification

### After Each Test, Verify:

1. **Applications Table:**
   ```sql
   SELECT COUNT(*) FROM benefit_applications;
   ```

2. **Status History:**
   ```sql
   SELECT COUNT(*) FROM application_status_history;
   ```

3. **Documents:**
   ```sql
   SELECT COUNT(*) FROM documents;
   ```

4. **Completion Progress:**
   ```sql
   SELECT 
     ba.id,
     ba.application_type,
     COUNT(d.id) as total_docs,
     SUM(CASE WHEN d.status IN ('submitted', 'approved', 'uploaded') THEN 1 ELSE 0 END) as submitted_docs
   FROM benefit_applications ba
   LEFT JOIN documents d ON d.application_id = ba.id
   GROUP BY ba.id, ba.application_type;
   ```

---

## Success Criteria

### All Tests Pass When:

- ✅ Server starts without errors
- ✅ All new endpoints return valid responses
- ✅ Completion percentage shows 0% for no documents
- ✅ Completion percentage calculates correctly
- ✅ Processing time uses real data (not 12)
- ✅ Recent activity combines all 3 types
- ✅ My Seniors returns assigned seniors only
- ✅ Dashboard stats returns complete data
- ✅ Filters work on all endpoints
- ✅ Delete removes application and related records
- ✅ Error handling works correctly
- ✅ Response times are acceptable

---

## Troubleshooting

### Common Issues:

#### 1. "Application not found"
- Verify application ID exists
- Check database for record

#### 2. "Authentication required"
- Verify token is valid
- Check token hasn't expired
- Ensure Authorization header is set

#### 3. "Access denied"
- Verify user has staff role
- Check user department is 'benefits' (for my-seniors)

#### 4. completionPercentage is NaN or 100%
- **FIXED** - Should no longer occur
- If still happening, check backend logs

#### 5. avgProcessingDays is 12
- **FIXED** - Should show real value
- If still 12, check database has completed applications

---

## Next Steps

1. ✅ Run all endpoint tests
2. ✅ Verify bug fixes (completion %, processing time)
3. ✅ Test error scenarios
4. ✅ Measure performance
5. ⏳ Integrate with frontend
6. ⏳ Add polling for real-time updates
7. ⏳ Implement CSV export
8. ⏳ Deploy to production

---

**Testing Date:** 2025-11-25  
**Status:** Ready for Testing  
**All Endpoints:** Implemented and Server Running
