# Cliniva Database

This directory contains the complete MongoDB database implementation for the Cliniva clinic management system, converted from the comprehensive SQL schema documentation.

## 📁 Structure

```
database/
├── schemas/                    # All Mongoose schemas
│   ├── subscription-plan.schema.ts
│   ├── subscription.schema.ts
│   ├── user.schema.ts
│   ├── organization.schema.ts
│   ├── complex.schema.ts
│   ├── clinic.schema.ts
│   ├── patient.schema.ts
│   ├── appointment.schema.ts
│   ├── invoice.schema.ts
│   └── ... (25+ schemas total)
├── seeders/                    # Database seeding functionality
│   └── database-seeder.service.ts
├── database.module.ts          # Main database module
├── database.service.ts         # Core database service
├── database.controller.ts      # Database management endpoints
└── database-initializer.service.ts # Database initialization
```

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env` file from the example:

```bash
cp env.example .env
```

Configure your MongoDB connection:

```env
MONGODB_URI=mongodb://localhost:27017/cliniva
DATABASE_SEED=true  # Set to true for auto-seeding on startup
```

### 2. Start the Application

```bash
npm run start:dev
```

The database will automatically connect and seed if `DATABASE_SEED=true`.

### 3. Manual Database Operations

```bash
# Initialize database with seed data
npm run db:init

# Seed database only
npm run db:seed

# Reset and reseed database
npm run db:reset
```

## 📊 Database Schema Overview

### Core Entities

1. **Subscription Management**
   - `SubscriptionPlan` - Available subscription plans (clinic, complex, company)
   - `Subscription` - User subscriptions

2. **User Management**
   - `User` - All users (owners, admins, doctors, staff, patients)
   - `UserAccess` - Unified access control system
   - `UserLocation` - Multiple addresses per user

3. **Organizational Structure**
   - `Organization` - Companies/Organizations
   - `Complex` - Medical complexes/locations
   - `Department` - Medical departments (Cardiology, Pediatrics, etc.)
   - `ComplexDepartment` - Junction table for departments in complexes
   - `Clinic` - Individual clinics

4. **Medical System**
   - `Specialty` - Medical specialties
   - `DoctorSpecialty` - Doctor-specialty relationships
   - `Patient` - Patient records
   - `Service` - Medical services
   - `ClinicService` - Services offered by clinics

5. **Appointments & Reports**
   - `Appointment` - Appointment scheduling
   - `MedicalReport` - Medical reports from appointments

6. **Billing & Payments**
   - `Invoice` - Patient invoices
   - `InvoiceItem` - Invoice line items
   - `Payment` - Payment records
   - `InsuranceClaim` - Insurance claim management

7. **Offers & Discounts**
   - `Offer` - Discount offers
   - `OfferTarget` - Offer targeting system
   - `AppointmentOffer` - Applied discounts

8. **Communication**
   - `Notification` - System notifications
   - `EmailTemplate` - Email templates
   - `SmsTemplate` - SMS templates

9. **Dynamic Information**
   - `DynamicInfo` - Flexible information storage
   - `Contact` - Social media and contact information
   - `WorkingHours` - Operating hours

10. **Employee Management**
    - `EmployeeShift` - Employee scheduling

11. **Audit Trail**
    - `AuditLog` - Complete audit trail system

## 🔧 API Endpoints

### Database Management

- `GET /database/health` - Check database health
- `GET /database/info` - Get database information
- `GET /database/test` - Test database connection
- `GET /database/ping` - Quick database ping
- `POST /database/initialize` - Initialize database
- `POST /database/seed` - Seed database
- `POST /database/reset` - Reset and reseed database

### Usage Examples

```bash
# Check database health
curl http://localhost:3000/database/health

# Initialize database
curl -X POST http://localhost:3000/database/initialize

# Seed database
curl -X POST http://localhost:3000/database/seed
```

## 🌱 Seeded Data

The database automatically seeds with:

### Subscription Plans
- **Clinic Plan** ($99.99) - Single clinic management
- **Complex Plan** ($299.99) - Up to 10 clinics in one complex
- **Company Plan** ($999.99) - Up to 50 complexes, 500 clinics

### Medical Departments
18 standard departments including:
- Cardiology, Dermatology, Emergency Medicine
- Endocrinology, Gastroenterology, General Medicine
- Gynecology, Neurology, Obstetrics, Oncology
- Ophthalmology, Orthopedics, Otolaryngology
- Pediatrics, Psychiatry, Pulmonology, Radiology, Urology

### Medical Specialties
Corresponding specialties for each department with detailed descriptions.

### Communication Templates
- **Email Templates**: Appointment confirmation/reminder emails
- **SMS Templates**: Appointment confirmation/reminder SMS

## 🔍 Key Features

### 1. Multi-Tenant Architecture
- Supports clinic-only, complex, and company-wide plans
- Flexible organizational hierarchy
- Unified access control system

### 2. Comprehensive Medical Management
- Patient records with medical history
- Appointment scheduling with service management
- Medical reports linked to appointments
- Doctor specialties and certifications

### 3. Enterprise Billing System
- Complete invoice management
- Multiple payment methods
- Insurance claim processing
- Discount and offer system

### 4. Advanced Communication
- Multi-channel notifications (in-app, email, SMS, push)
- Template-based messaging
- Scheduled notifications

### 5. Audit Trail & Compliance
- Complete change tracking
- User activity monitoring
- Soft delete capabilities
- Version control for medical reports

## 🔐 Security Features

- User role-based access control
- Audit logging for all changes
- Password reset functionality (ready)
- Two-factor authentication (ready)
- Email verification (ready)

## 🚀 Production Ready

This database schema is designed for production use with:

- **Proper indexing** for optimal performance
- **Data validation** through Mongoose schemas
- **Relationship management** through ObjectId references
- **Scalable architecture** supporting multi-tenancy
- **Comprehensive audit trails** for compliance
- **Flexible schema design** for future enhancements

## 📈 Future Enhancements

The schema is prepared for:

1. **Patient Portal Integration**
   - Optional user account linking for patients
   - Portal access controls
   - Medical report visibility settings

2. **Advanced Reporting**
   - Analytics and reporting modules
   - Performance metrics
   - Financial reporting

3. **Integration Capabilities**
   - External API integrations
   - Third-party service connections
   - Import/export functionality

## 🛠️ Development

### Adding New Schemas

1. Create schema file in `schemas/` directory
2. Export from `schemas/index.ts`
3. Add to `database.module.ts` imports
4. Update seeder if needed

### Schema Conventions

- Use TypeScript classes with decorators
- Include proper indexing
- Add virtual properties when needed
- Use enums for status fields
- Include audit fields (createdBy, updatedBy, deletedAt)

### Testing

```bash
# Run all tests
npm test

# Run database-specific tests
npm test -- --testPathPattern=database

# Run with coverage
npm run test:cov
```

This database implementation provides a robust foundation for the Cliniva clinic management system with room for future growth and enhancements.
