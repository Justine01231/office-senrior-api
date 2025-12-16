# Quick Test Guide - Reschedule Requests Feature

## ✅ Status: READY TO TEST

All fixes have been applied! Here's how to test the reschedule requests feature.

## Prerequisites Checklist

✅ Backend server is running on `http://localhost:8000`
✅ Database migration applied successfully
✅ Android app connected to backend
✅ You have both senior and staff accounts

## Quick Test (5 minutes)

### Test Users Available:
- **Senior**: username: `justine` (ID: 9)
- **Staff**: username: `john` (ID: 4)

### Step 1: Submit Reschedule Request (as Senior)

1. Open Android app
2. Login as `justine` (senior account)
3. Navigate to: **Dashboard → My Appointments**
4. If you don't have any appointments, ask a health coordinator to create one first
5. Select an appointment and click **"Reschedule Request"**
6. Fill out:
   - **Reason**: "Need to change due to family emergency"
   - **Requested Date**: Choose any future date
   - **Requested Time**: Choose any time
7. Click **"Submit Request"**
8. ✅ Should see success message

**What to check**:
- ✅ Success message appears
- ✅ Request is saved

### Step 2: View Reschedule Requests (as Health Coordinator)

1. Logout from senior account
2. Login as `john` (staff account)
3. Navigate to: **Dashboard → Appointments**
4. 🎯 **EXPECTED RESULT**: You should now see a card:
   ```
   ┌─────────────────────────────────────┐
   │ 🔄 Reschedule Requests              │
   │                          [1 pending]│
   │                                     │
   │ Seniors can request appointment     │
   │ reschedules. Review and approve/    │
   │ reject requests.                    │
   │                                     │
   │ [View Reschedule Requests]          │
   └─────────────────────────────────────┘
   ```
5. Click **"View Reschedule Requests"**
6. ✅ Should see list of pending requests with:
   - Senior name
   - Appointment title
   - Original date/time
   - Requested date/time
   - Reason
   - Approve/Reject buttons

### Step 3: Take Action on Request

1. Select a reschedule request
2. Choose one:
   - **Approve**: Select new date/time, add notes, click "Approve"
   - **Reject**: Provide reason, click "Reject"
3. ✅ Request should be removed from pending list
4. Go back to Appointments
5. ✅ Reschedule card should update count (or hide if no more pending)

## Troubleshooting

### Issue: Reschedule card doesn't show

**Check 1: Backend Running?**
```bash
curl http://localhost:8000/health
```
Expected: `{"status":"ok",...}`

If fails → Start backend:
```bash
cd C:\Users\Jus\Desktop\office-seniors-api
bun run dev
```

**Check 2: Any reschedule requests in database?**
- Make sure you created a request as senior first
- The card only shows when there are pending requests

**Check 3: Check backend logs**
When you open Appointments screen, you should see in backend console:
```
🔄 ===== RESCHEDULE REQUESTS API CALLED =====
🔄 User ID: 4
🔄 User Role: staff
✅ User authenticated - proceeding to fetch reschedule requests
🔄 Database query completed - Found X total reschedule requests
```

If you don't see these logs → Frontend can't reach backend

**Check 4: Check Android logcat**
```bash
adb logcat | grep "RESCHEDULE"
```

Should see:
```
🔍 ===== FRONTEND: Loading Reschedule Requests Count =====
🔍 RESCHEDULE API Response Code: 200
🔍 RESCHEDULE Total Pending Count: X
🔍 RESCHEDULE Showing section with count: X
```

### Issue: "Network error" message

**Solution**:
1. Ensure backend is running on `0.0.0.0:8000`
2. Ensure Android emulator is using `http://10.0.2.2:8000` as base URL
3. Check `RetrofitClient.java` has correct BASE_URL

### Issue: Authentication failed (401)

**Solution**:
1. Logout and login again in the app
2. Check token is being saved correctly
3. Check backend logs for authentication errors

## Expected Behavior

✅ **Card Visibility**:
- Shows ONLY when there are pending reschedule requests
- Hides automatically when no pending requests
- Updates in real-time when screen resumes

✅ **Badge Count**:
- Shows correct count of pending requests
- Updates after approve/reject actions

✅ **API Flow**:
- Senior submits → `POST /api/reschedule-requests` → Status 200
- Staff views → `GET /api/reschedule-requests` → Status 200 with data
- Staff approves → `POST /api/reschedule-requests/:id/approve` → Status 200
- Staff rejects → `POST /api/reschedule-requests/:id/reject` → Status 200

## Backend Logs to Monitor

Terminal where backend is running should show:
```
📡 GET /api/reschedule-requests
🔄 ===== RESCHEDULE REQUESTS API CALLED =====
🔄 User ID: 4
🔄 User Role: staff
✅ User authenticated - proceeding to fetch reschedule requests
🔄 Database query completed - Found 1 total reschedule requests
📋 Reschedule Requests Details:
   1. ID: 1, Senior: Justine Embudo, Status: pending, Reason: ...
✅ Returning 1 total requests (1 pending)
🔄 ===== END RESCHEDULE REQUESTS API =====
```

## Success Criteria

✅ Senior can submit reschedule request
✅ Request is saved in database with status "pending"
✅ Health Coordinator sees reschedule card in Appointments screen
✅ Card shows correct pending count
✅ Clicking "View Reschedule Requests" shows all pending requests
✅ Can approve requests (updates appointment, changes status to "approved")
✅ Can reject requests (changes status to "rejected")
✅ Card count updates after approve/reject
✅ Card hides when no pending requests

## Need Help?

1. **Check logs** - Both backend console and Android logcat
2. **Verify backend is running** - `curl http://localhost:8000/health`
3. **Check database** - Ensure reschedule_requests table exists
4. **Review full documentation** - See `RESCHEDULE_REQUESTS_FIX_COMPLETE.md`

---

**Ready to test?** Follow steps 1-3 above and you should see the reschedule requests appearing in the Health Coordinator dashboard! 🎉
