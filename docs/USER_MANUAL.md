# JIH Sewing Classes Management System — Non-Technical User Manual

Welcome to the Jamaat-e-Islami Hind (JIH) Sewing Classes Management System user guide. This manual provides simple, step-by-step instructions to help staff across all roles navigate and operate the portal effectively.

---

## 🚪 Getting Started & Logging In

1. **Accessing the Portal**: Open your web browser and navigate to the portal address provided by your System Administrator (e.g. `http://localhost:5173`).
2. **Signing In**:
   - Enter your registered **10-digit Phone Number** (e.g. `9000000001`).
   - Enter your **Password**. Click the eye icon (👁️) to toggle password visibility if needed.
   - Click **Sign In to Portal**.
3. **Forgot Password**: If you forget your password, click the *Forgot password?* link on the login page. Contact your System Administrator or Branch Supervisor to reset your password credential.

---

## 👩‍🏫 Instructions for Class Teachers

As a Class Teacher, your portal access focuses on daily student attendance, fee collections, student enrollment, student leave, and exam marks.

### 1. Marking Daily Attendance
1. Click **Attendance** in the top navigation bar.
2. Select the **Class Date** (defaults to today).
3. For each student row:
   - Click **✓ Present** if the student is attending class today.
   - Click **✗ Absent** if the student is absent.
4. **Lock-In & Making Corrections**:
   - Once you click Present or Absent, the button locks into place with a filled badge style.
   - If you make a mistake before leaving the page, click the **✏️ Change** button next to the selection. The row will return to neutral, allowing you to pick again.
5. Click **Save Attendance** at the bottom of the page.

> 🔒 **Note on Attendance Locking**: Once an attendance date has been locked by administrators or historical deadline policies, a warning banner (*"ATTENDANCE LOCKED"*) will appear and edit buttons will disappear. Contact your Area Supervisor if historical corrections are required.

### 2. Registering a New Student
1. Navigate to **Students** and click **+ Add Student**.
2. Fill in the student's **Full Name**, **Phone Number**, **Address**, and **Admission Date**.
3. Select the enrolled **Course** (e.g. *Basic Course* or *Designer Course*).
4. **Setting Fee Relief**:
   - Select **None** if full course fees apply.
   - Select **Partial** and enter the relief amount (e.g. ₹100) if the student receives a partial discount. The form automatically calculates and previews the net payable monthly fee.
   - Select **Full** if the student is admitted on full scholarship.
5. Click **Register Student**.

### 3. Recording Fee Payments
1. Click **Students**, find the student, and click **View Profile**.
2. Scroll to the **Monthly Fee Cycles** section.
3. Locate the pending month and click **Record Payment**.
4. Enter the amount received and click **Confirm Payment**. The status badge will update to **PAID**.

### 4. Submitting Student Leave Requests
1. Navigate to **Leave Requests** and click **New Leave Request**.
2. Select the student, start date, end date, and reason (e.g. *Medical Leave*).
3. Click **Submit Request**. Once approved by your supervisor, attendance records for those dates will automatically show **ON APPROVED LEAVE**.

---

## 📋 Instructions for Area Supervisors

Supervisors oversee branch operations, manage staff, handle approvals, and track branch machine assets.

### 1. Approving Student Leave Requests
1. Click **Leave Requests** in the top navigation bar.
2. View pending requests under your assigned branches.
3. Click **✓ Approve** or **✗ Reject**. Approving a leave automatically marks the student as *Leave* on the attendance sheet and excludes those days from their attendance percentage calculation.

### 2. Declaring Branch Holidays
1. Navigate to **Holidays** and click **+ Declare Holiday**.
2. Select the holiday date, enter the holiday title (e.g. *Eid Holiday*), and select your branch.
3. Click **Save Holiday**. The attendance sheet for that date will lock automatically for non-admin users.

### 3. Managing Sewing Machines & Maintenance
1. Navigate to **Manage ▾** $\rightarrow$ **Machines**.
2. View machine inventory across your assigned branches.
3. To update machine status, click **Edit** on a machine row and transition status to **Needs Maintenance**, **Under Repair**, or **Working**.

### 4. Logging Branch Expenses & Staff Salaries
1. Navigate to **Manage ▾** $\rightarrow$ **Branches**, select your branch, and click **Branch Finance**.
2. Click **+ Add Expense** to record utility bills, thread purchases, or repair costs.
3. Click **+ Record Salary** to log monthly staff salary disbursements.

---

## 📊 Instructions for Amir-e-Muqami

Amir leaders have executive oversight across all assigned branches.

### 1. Multi-Branch Oversight Dashboard
1. Upon logging in, your dashboard displays **Branch Performance Oversight**.
2. Compare metrics across branches:
   - **Enrolled Students**: Active count per branch.
   - **Monthly Attendance %**: Aggregate student attendance percentage.
   - **Fee Collection Rate**: Paid vs. due fee ratio.
   - **Machine Working Status**: Operational machine count.

### 2. Interpreting Financial Shortfall Banners
If a branch operates at a temporary financial shortfall (expenses exceeding local fee collections), the system highlights the card with a shortfall badge and displays an official JIH disclaimer banner:
> *"ACCOUNTING NOTICE: These entries are for accounting purposes only. Branch shortfalls are covered by Jamaat-e-Islami Hind headquarters."*

---

## ⚙️ Instructions for System Administrators

System Admins possess organization-wide configuration and administrative permissions.

### 1. User & Staff Management
1. Navigate to **Manage ▾** $\rightarrow$ **Users**.
2. Click **+ Add User** to create new admin, supervisor, amir, or teacher accounts.
3. To deactivate a staff member who has left the organization, click **Deactivate**. Inactive users are blocked from logging in.

### 2. Certificate Background Upload & Visual Field Positioning
1. Navigate to **Manage ▾** $\rightarrow$ **Cert Templates**.
2. Click **Upload New Template**, enter a title, and attach the official certificate background image (PNG/JPG) or PDF.
3. Click **Activate** on the template.
4. **Visual Positioning Canvas**:
   - Drag text fields (Student Name, Course Name, Certificate No, Issue Date, Grade) over the background image.
   - Adjust font size and coordinates using the toolbar controls.
   - Click **Save Field Positions**. Issued certificates will automatically position student data over the uploaded background.

---

## ❓ Frequently Asked Questions & Troubleshooting

| Question / Problem | Solution |
|---|---|
| **Why can't I edit today's attendance sheet?** | Check if today's date has been declared a Holiday or if the date has been marked **LOCKED** by your administrator. |
| **Why doesn't a student appear in my attendance list?** | Ensure the student's status is set to **Active**. Inactive or dropped students are excluded from active daily attendance sheets. |
| **Why can't I assign a teacher to a second branch?** | The system enforces the **One Teacher, One Branch Rule**. A teacher must be unassigned from their current branch before being assigned to another active branch. |
| **How do I print an official certificate?** | Go to **Exams**, locate the passed student record, click **View Certificate**, and click **Print / Export PDF**. |
