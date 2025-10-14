import { model, Schema } from 'mongoose';

// Subscription Management
export * from './subscription-plan.schema';
export * from './subscription.schema';

// User Management
export * from './user.schema';
export * from './user-access.schema';
export * from './user-location.schema';

// Organizational Structure
export * from './organization.schema';
export * from './complex.schema';
export * from './department.schema';
export * from './complex-department.schema';
export * from './clinic.schema';

// Medical Specialties
export * from './specialty.schema';
export * from './doctor-specialty.schema';

// Patient Management
export * from './patient.schema';

// Services & Appointments
export * from './service.schema';
export * from './clinic-service.schema';
export * from './appointment.schema';
export * from './medical-report.schema';

// Offers & Discounts
export * from './offer.schema';
export * from './offer-target.schema';
export * from './appointment-offer.schema';

// Billing & Payment Management
export * from './invoice.schema';
export * from './invoice-item.schema';
export * from './payment.schema';
export * from './insurance-claim.schema';

// Notification & Communication System
export * from './notification.schema';
export * from './email-template.schema';
export * from './sms-template.schema';

// Dynamic Information System
export * from './dynamic-info.schema';
export * from './contact.schema';
export * from './working-hours.schema';
export * from './schedule.schema';

// Employee Management
export * from './employee-shift.schema';
export * from './employee-profile.schema';
export * from './employee-document.schema';
export * from './emergency-contact.schema';

// Audit Trail
export * from './audit-log.schema';
export * from './access-log.schema';

// Define your schemas here or import them from separate files
const userSchema = new Schema({
    // your user schema definition
});

const organizationSchema = new Schema({
    // your organization schema definition
});

// ... other schemas ...

// Ensure models are properly defined with schemas before export
const models = {
    User: model('User', new Schema({})),
    Organization: model('Organization', new Schema({})),
    Complex: model('Complex', new Schema({})),
    Clinic: model('Clinic', new Schema({})),
    Patient: model('Patient', new Schema({})),
    Service: model('Service', new Schema({})),
    Appointment: model('Appointment', new Schema({})),
    Invoice: model('Invoice', new Schema({})),
    Payment: model('Payment', new Schema({})),
    InsuranceClaim: model('InsuranceClaim', new Schema({})),
    EmployeeProfile: model('EmployeeProfile', new Schema({})),
    EmployeeDocument: model('EmployeeDocument', new Schema({})),
    EmployeeShift: model('EmployeeShift', new Schema({})),
    MedicalReport: model('MedicalReport', new Schema({})),
    Offer: model('Offer', new Schema({})),
    AppointmentOffer: model('AppointmentOffer', new Schema({})),
    AccessLog: model('AccessLog', new Schema({})),
    AuditLog: model('AuditLog', new Schema({})),
    Notification: model('Notification', new Schema({}))
};

export const {
    User, Organization, Complex, Clinic, Patient,
    Service, Appointment, Invoice, Payment, InsuranceClaim,
    EmployeeProfile, EmployeeDocument, EmployeeShift,
    MedicalReport, Offer, AppointmentOffer, AccessLog,
    AuditLog, Notification
} = models;
