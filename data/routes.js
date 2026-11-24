/**
 * Authenticated GET routes discovered from the admin sidebar, grouped by module.
 * Every route here must render for the admin user without redirecting to /login
 * or showing a server error. Routes that may change state on GET
 * (e.g. /school/dashboard/preview-theme/*) are intentionally excluded.
 */
module.exports = {
  Dashboard: ['/school/dashboard', '/school/apps', '/school/notifications', '/school/my-settings'],
  'Front Office': [
    '/school/front-office/dashboard', '/school/front-office/admission-enquiries', '/school/front-office/complaints',
    '/school/front-office/postal-records', '/school/front-office/visitor-logs',
  ],
  Students: [
    '/school/student-dashboard', '/school/students', '/school/students/create', '/school/parents',
    '/school/student-categories', '/school/student-houses', '/school/disabled-students', '/school/student-behavior',
    '/school/promote-students', '/school/assign-electives', '/school/student-attendance', '/school/admission-settings',
  ],
  Academics: [
    '/school/academics/dashboard', '/school/academic-sessions', '/school/academic-sessions/create', '/school/classes',
    '/school/classes/create', '/school/sections', '/school/subjects', '/school/subjects/create', '/school/assign-subjects',
    '/school/assign-class-teacher', '/school/time-slots', '/school/timetable', '/school/events', '/school/events/create',
  ],
  'Study Center': [
    '/school/study-center', '/school/study-center/classwork', '/school/study-center/homework',
    '/school/study-center/live-classes', '/school/study-center/live-classes/settings', '/school/study-center/materials',
    '/school/study-center/syllabus',
  ],
  Exams: [
    '/school/exams-dashboard', '/school/exams', '/school/exams/create', '/school/exam-types', '/school/exam-schedule',
    '/school/exam-marks/entry', '/school/grades', '/school/marksheet', '/school/marksheet-remarks', '/school/marksheet/upload',
    '/school/marksheet/upload-list', '/school/report-card-setups', '/school/cocurricular-areas', '/school/cocurricular-grades',
    '/school/online-exam/manage-exams', '/school/online-exam/question-bank',
  ],
  Assessment: ['/school/assessment/dashboard', '/school/assessment/assessments', '/school/assessment/reports', '/school/assessment/guide'],
  CAS: [
    '/school/cas/dashboard', '/school/cas/setup', '/school/cas/strands', '/school/cas/criteria', '/school/cas/marks',
    '/school/cas/reports', '/school/cas/periods',
  ],
  Fees: [
    '/school/fees-dashboard', '/school/collect-fees', '/school/due-fees', '/school/due-slips', '/school/due-slips/history',
    '/school/fee-groups', '/school/fee-types', '/school/fee-discounts', '/school/assign-fees', '/school/fees-carry-forward',
    '/school/fee-challans', '/school/online-payments', '/school/transactions',
  ],
  Accounts: [
    '/school/accounting/dashboard', '/school/accounts/incomes', '/school/accounts/income-heads', '/school/accounts/expenses',
    '/school/accounts/expense-heads', '/school/bank-accounts',
  ],
  'HR & Payroll': [
    '/school/hr-dashboard', '/school/staff', '/school/staff/create', '/school/departments', '/school/designations',
    '/school/staff-attendance', '/school/staff-id-card', '/school/staff-salary', '/school/salary-templates', '/school/payroll',
    '/school/loans', '/school/leave-types', '/school/approve-leave', '/school/appraisals', '/school/appraisal-cycles',
    '/school/appraisal-criteria', '/school/hr-settings',
  ],
  Inventory: [
    '/school/inventory/dashboard', '/school/inventory/items', '/school/inventory/categories', '/school/inventory/add-stock',
    '/school/inventory/issue-item', '/school/inventory/suppliers', '/school/inventory/purchase-orders', '/school/inventory/grns',
    '/school/inventory/supplier-payments', '/school/inventory/sales', '/school/inventory/sales/create',
  ],
  Communication: [
    '/school/notices', '/school/notices/create', '/school/communicate/broadcast', '/school/communicate/broadcast/create',
    '/school/comms', '/school/gallery',
  ],
  Leads: ['/school/leads/dashboard', '/school/leads/board', '/school/leads/settings'],
  'Documents & Library': [
    '/school/certificate-templates', '/school/certificate-templates/create', '/school/generate-document',
    '/school/library/books/create',
  ],
  'Knowledge Base': ['/school/knowledge-base/articles', '/school/knowledge-base/categories', '/school/knowledge-base/chatbot'],
  'Settings & Admin': [
    '/school/settings', '/school/module-settings', '/school/roles', '/school/custom-fields', '/school/notification-settings',
    '/school/gateway-settings', '/school/social-media-settings', '/school/telegram-settings', '/school/qr-attendance/settings',
    '/school/biometric/devices', '/school/landing-page', '/school/backups', '/school/audit-trail', '/school/reports',
    '/school/subscription', '/school/payment-history', '/school/support',
  ],
};
