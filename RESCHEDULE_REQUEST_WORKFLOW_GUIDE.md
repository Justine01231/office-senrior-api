# 🔄 Complete Reschedule Request Workflow Guide

## ✅ How the Reschedule Request System Works

### **For Seniors (Making Requests):**

1. **Senior Dashboard** → Click "My Appointments"
2. **Find appointment card** → Click "Request Reschedule" button
3. **Fill reschedule form:**
   - Enter reason (required)
   - Select new preferred date
   - Select new preferred time
4. **Submit request** → Request sent to Health Coordinator

### **For Health Coordinators (Managing Requests):**

#### **Option 1: From Staff Dashboard (Main Entry Point)**
1. **Health Coordinator Dashboard** → Click "Reschedule Requests" card
2. **View all pending requests** with beautiful cards showing:
   - Senior name and original appointment
   - Requested new date/time
   - Reason for reschedule
   - **APPROVE** and **REJECT** buttons

#### **Option 2: From Appointments Section**
The appointments section could also show a badge or indicator for pending reschedule requests.

### **Approval/Rejection Process:**

#### **When APPROVE is clicked:**
1. **Approval dialog opens** with:
   - Confirm new date/time (can be modified)
   - Add coordinator notes
   - Click "Approve Request"
2. **Backend updates:**
   - Original appointment gets updated with new date/time
   - Request status changed to "approved"
   - Senior sees updated appointment in their dashboard
3. **Real-time sync:** Senior dashboard updates immediately

#### **When REJECT is clicked:**
1. **Rejection dialog opens** with:
   - Text field for rejection reason
   - Click "Reject Request"
2. **Backend updates:**
   - Original appointment remains unchanged
   - Request status changed to "rejected"
   - Senior sees rejection notification
3. **Real-time sync:** Senior dashboard shows rejection

## 🎯 Current Implementation Status

### ✅ **Already Working:**
1. **RescheduleRequestsActivity** - Complete management interface
2. **Staff Dashboard** - "Reschedule Requests" card navigation
3. **Senior Side** - Request creation and submission
4. **Backend APIs** - All endpoints implemented
5. **Approval/Rejection Dialogs** - Full functionality

### 🔧 **What You Need to Access:**

**As Health Coordinator:**
1. Open **Staff Dashboard** (Health Coordinator Dashboard)
2. Look for **"Reschedule Requests"** card
3. Click it to open the management interface
4. You'll see all pending requests from seniors
5. Each request shows **APPROVE** and **REJECT** buttons

## 📋 **Reschedule Request Card Features:**

Each request card displays:
```
👤 Senior Name: John Doe
📅 Original: Dec 15, 2024 at 2:00 PM
📅 Requested: Dec 20, 2024 at 10:00 AM
📝 Reason: "Conflict with family appointment"
⏰ Requested: 2 hours ago

[APPROVE] [REJECT]
```

## 🔄 **Real-Time Updates:**

### **When Approved:**
- Senior dashboard: Appointment card updates with new date/time
- Status changes to "Confirmed" 
- Request disappears from coordinator's pending list

### **When Rejected:**
- Senior dashboard: Shows rejection notification
- Original appointment remains with original date/time
- Status shows "Reschedule Rejected"
- Request disappears from coordinator's pending list

## 📱 **UI Feedback:**

### **For Seniors:**
- Success toast: "✅ Reschedule request sent successfully"
- Status indicators on appointment cards
- Real-time updates when approved/rejected

### **For Health Coordinators:**
- Badge on "Reschedule Requests" card showing pending count
- Real-time list updates when actions are taken
- Confirmation toasts for approve/reject actions

## 🚀 **Testing the Complete Flow:**

### **Step 1: Create a Reschedule Request (Senior)**
1. Login as Senior
2. Go to "My Appointments"
3. Click "Request Reschedule" 
4. Fill form and submit

### **Step 2: View and Manage Request (Health Coordinator)**
1. Login as Health Coordinator
2. Go to Staff Dashboard
3. Click "Reschedule Requests" card
4. See the pending request
5. Click either "APPROVE" or "REJECT"

### **Step 3: Verify Real-Time Updates**
1. Go back to Senior dashboard
2. Check "My Appointments"
3. See the updated appointment or rejection status

## 💡 **Pro Tips:**

1. **Badge Count:** The "Reschedule Requests" card shows a red badge with the number of pending requests
2. **Real-Time Sync:** All changes sync immediately across both dashboards
3. **Approval Flexibility:** Health coordinators can modify the requested date/time during approval
4. **Audit Trail:** All approvals/rejections are logged with timestamps and reasons

The complete reschedule request system is fully functional and ready to use! 🎉