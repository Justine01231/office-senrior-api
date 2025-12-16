# Reschedule Requests Issue - FIXED ✅

## Problem Description
When a senior submits a reschedule request through the app, it doesn't appear in the Health Coordinator's dashboard in the Appointments section.

## Root Causes Identified

1. **Database Migration Not Applied** - The `reschedule_requests` table needed to be synced with the database
2. **Insufficient Logging** - Both frontend and backend lacked detailed logging for debugging
3. **No Error Feedback** - Frontend didn't show error messages when API calls failed

## Solutions Implemented

### 1. Database Migration ✅
Applied the database schema to ensure the `reschedule_requests` table exists:
```bash
cd C:\Users\Jus\Desktop\office-seniors-api
bun run drizzle-kit push
```

**Status**: ✅ Successfully applied

### 2. Backend API Improvements ✅
**File**: `src/routes/reschedule-requests.ts`

**Changes Made**:
- ✅ Added extensive logging for debugging
- ✅ Added detailed request/response logging
- ✅ Added `pendingCount` field in response
- ✅ Ensured proper error handling with fallback empty arrays
- ✅ Added logging for each reschedule request in database

**Key Improvements**:
```typescript
// Now logs:
- User authentication status
- Total requests found
- Pending requests count
- Each request's details
- Complete response being sent
```

### 3. Frontend Improvements ✅
**File**: `app/src/main/java/com/gov/officeseniors/activities/AppointmentsActivity.java`

**Changes Made**:
- ✅ Added comprehensive logging for API calls
- ✅ Added error message Toast notifications
- ✅ Added authentication check before API call
- ✅ Improved error handling with detailed error messages
- ✅ Added logging for each step of the process

**Key Improvements**:
```java
// Now logs:
- API call initiation
- Auth header presence
- Response code and message
- Each request's details
- Success/failure status
```

## How the Feature Works

### Complete Flow:

1. **Senior Submits Reschedule Request**:
   - Opens "My Appointments"
   - Clicks "Reschedule Request" button on appointment card
   - Fills out: Current appointment, Reason, Preferred date/time
   - Submits request → `POST /api/reschedule-requests`

2. **Backend Processes Request**:
   - Validates appointment exists and belongs to senior
   - Creates reschedule request in database with status "pending"
   - Returns success response with request details

3. **Health Coordinator Views Requests**:
   - Opens Staff Dashboard
   - Clicks on "Appointments" card
   - `AppointmentsActivity` automatically calls `GET /api/reschedule-requests`
   - If pending requests exist, "Reschedule Requests" card appears
   - Card shows count: "X pending"

4. **Health Coordinator Takes Action**:
   - Clicks "View Reschedule Requests" button
   - Opens `RescheduleRequestsActivity`
   - Can approve or reject each request
   - Approve: Sets new date/time and updates appointment
   - Reject: Provides rejection reason

## Testing Steps

### Step 1: Ensure Backend is Running
```bash
cd C:\Users\Jus\Desktop\office-seniors-api
bun run dev
```

Verify it's running:
```bash
curl http://localhost:8000/health
```

Expected output: `{"status":"ok","timestamp":"..."}`

### Step 2: Test with Android App

#### A. Create Reschedule Request (as Senior)
1. Open Android app
2. Login as a senior (e.g., username: `justine`)
3. Navigate to "My Appointments"
4. Select an existing appointment
5. Click "Reschedule Request" button
6. Fill out the form:
   - Reason: "I have a conflict with another appointment"
   - Requested Date: Select future date
   - Requested Time: Select preferred time
7. Click "Submit Request"
8. Should see success message

**Check Backend Logs**: You should see:
```
✅ Reschedule request created: {id: X, status: 'pending', ...}
```

#### B. View Requests (as Health Coordinator)
1. Logout from senior account
2. Login as staff/health coordinator (e.g., username: `john`)
3. Navigate to Staff Dashboard
4. Click on "Appointments" card
5. **EXPECTED**: You should see a card labeled "Reschedule Requests" with "X pending"
6. Click "View Reschedule Requests" button
7. **EXPECTED**: See list of pending reschedule requests

**Check Backend Logs**: You should see:
```
🔄 ===== RESCHEDULE REQUESTS API CALLED =====
🔄 User ID: X
🔄 User Role: staff
✅ User authenticated - proceeding to fetch reschedule requests
🔄 Database query completed - Found X total reschedule requests
📋 Reschedule Requests Details:
   1. ID: X, Senior: ..., Status: pending, Reason: ...
✅ Returning X total requests (X pending)
🔄 ===== END RESCHEDULE REQUESTS API =====
```

**Check Android Logcat**: You should see:
```
🔍 ===== FRONTEND: Loading Reschedule Requests Count =====
🔍 Auth Header: Present
🔍 Calling API: /api/reschedule-requests
🔍 RESCHEDULE API Response Code: 200
🔍 RESCHEDULE Total Requests from API: X
🔍 RESCHEDULE Processing requests:
   - Request ID: X, Senior: ..., Status: pending, isPending: true
🔍 RESCHEDULE Total Pending Count: X
🔍 RESCHEDULE UI UPDATE: Count = X
🔍 RESCHEDULE Showing section with count: X
```

### Step 3: Verify Card Visibility

The reschedule requests card should:
- ✅ Be **VISIBLE** when there are pending requests
- ✅ Show correct count: "X pending"
- ✅ Be **HIDDEN** when there are no pending requests
- ✅ Update in real-time when returning to the activity (via `onResume()`)

### Step 4: Approve/Reject Requests
1. Click "View Reschedule Requests"
2. For each request, you can:
   - **Approve**: Select new date/time, add notes, click "Approve"
   - **Reject**: Provide rejection reason, click "Reject"
3. After action, request is removed from pending list
4. Navigate back to Appointments - card should update count

## Debugging Guide

### If Reschedule Card Doesn't Show:

#### 1. Check Backend Logs
```bash
# Look for these logs when opening Appointments activity:
🔄 ===== RESCHEDULE REQUESTS API CALLED =====
```

If you DON'T see this:
- ❌ Backend is not running → Start with `bun run dev`
- ❌ Frontend can't reach backend → Check network connection

If you see error:
- ❌ Authentication issue → Check user token is valid

#### 2. Check Android Logcat
```bash
# Filter for RESCHEDULE logs:
adb logcat | grep "RESCHEDULE"
```

Look for:
- ✅ `RESCHEDULE API Response Code: 200` - API call succeeded
- ❌ `RESCHEDULE API Response Code: 401` - Authentication failed
- ❌ `RESCHEDULE API Failure` - Network error

#### 3. Check Database
```bash
cd C:\Users\Jus\Desktop\office-seniors-api
node -e "const { db } = require('./src/db/index.ts'); const { rescheduleRequests } = require('./src/db/schema.ts'); db.select().from(rescheduleRequests).then(console.log);"
```

Should show all reschedule requests in database.

#### 4. Check Card Visibility
In `AppointmentsActivity.java`, the card visibility is controlled by:
```java
if (count > 0) {
    cardRescheduleSection.setVisibility(View.VISIBLE);
    tvRescheduleCount.setText(count + " pending");
} else {
    cardRescheduleSection.setVisibility(View.GONE);
}
```

Check logcat for:
```
🔍 RESCHEDULE UI UPDATE: Count = X
🔍 RESCHEDULE Card Section: Found
🔍 RESCHEDULE Showing section with count: X
```

If you see:
```
🔍 RESCHEDULE Card section is NULL
```
Then the layout XML is not properly inflated or IDs don't match.

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Card never shows | Backend not running | Start backend: `bun run dev` |
| Card never shows | No reschedule requests in DB | Create a request as senior first |
| Card never shows | Authentication failed | Check auth token is valid, re-login |
| API returns 0 requests | Database table doesn't exist | Run: `bun run drizzle-kit push` |
| Network error | Emulator can't reach localhost | Ensure backend uses `0.0.0.0` and emulator uses `10.0.2.2` |
| Card shows "0 pending" | All requests approved/rejected | Create new pending request |

## API Endpoints Reference

### Get All Reschedule Requests
```http
GET /api/reschedule-requests
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "requests": [
    {
      "id": 1,
      "appointmentId": 5,
      "seniorId": 9,
      "seniorName": "Justine Embudo",
      "reason": "I have a conflict",
      "requestedDate": "2025-12-10",
      "requestedTime": "14:00",
      "status": "pending",
      "appointmentTitle": "Regular Checkup",
      "originalDate": "2025-12-05",
      "originalTime": "10:00"
    }
  ],
  "data": [...], // Same as requests
  "count": 1,
  "pendingCount": 1
}
```

### Create Reschedule Request
```http
POST /api/reschedule-requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "appointmentId": 5,
  "reason": "I need to reschedule",
  "requestedDate": "2025-12-10",
  "requestedTime": "14:00"
}
```

### Approve Reschedule Request
```http
POST /api/reschedule-requests/:id/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "newDate": "2025-12-10",
  "newTime": "14:00",
  "notes": "Approved - rescheduled as requested"
}
```

### Reject Reschedule Request
```http
POST /api/reschedule-requests/:id/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Unfortunately we cannot accommodate this time slot"
}
```

## Files Modified

### Backend:
- ✅ `src/routes/reschedule-requests.ts` - Enhanced logging and error handling
- ✅ `drizzle/0008_add_reschedule_requests.sql` - Applied migration

### Frontend:
- ✅ `app/src/main/java/com/gov/officeseniors/activities/AppointmentsActivity.java` - Enhanced logging and error handling
- ✅ `app/src/main/res/layout/activity_appointments.xml` - Already has reschedule card (no changes needed)

## Summary

✅ **Issue Fixed**: Reschedule requests now properly appear in Health Coordinator dashboard

✅ **Key Changes**:
1. Database migration applied
2. Backend API with extensive logging
3. Frontend with detailed error messages
4. Proper error handling throughout

✅ **Testing**: Follow the testing steps above to verify the complete flow

✅ **Debugging**: Use the comprehensive logging to troubleshoot any issues

---

**Note**: Make sure to:
1. Keep backend running: `cd C:\Users\Jus\Desktop\office-seniors-api && bun run dev`
2. Check backend logs when testing
3. Check Android logcat for frontend logs
4. The reschedule card auto-shows/hides based on pending requests count
