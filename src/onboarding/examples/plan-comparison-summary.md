# 📊 Onboarding Plan Comparison

## 🎯 Quick Overview

| Plan Type | Primary Entity | Max Organizations | Max Complexes | Max Clinics | Business Profile Required |
|-----------|----------------|-------------------|---------------|-------------|---------------------------|
| **Company** | Organization | 1 | 50 | 500 | ✅ Organization Level |
| **Complex** | Complex | 0 | 1 | 50 | ✅ Complex Level |
| **Clinic** | Clinic | 0 | 0 | 1 | ✅ Clinic Level |

## 🏗️ Data Structure Flow

### Company Plan Flow
```
User Registration
    ↓
Subscription (Company Plan)
    ↓
Organization (HealthCorp Medical Group)
    ├── Complex 1 (Riyadh)
    │   ├── Department: Cardiology
    │   ├── Department: Pediatrics
    │   └── Clinic: Heart Center
    └── Complex 2 (Jeddah)
        ├── Department: Cardiology
        ├── Department: Gynecology
        └── Clinic: Women's Health Center
```

### Complex Plan Flow
```
User Registration
    ↓
Subscription (Complex Plan)
    ↓
Complex (Al-Zahra Medical Complex)
    ├── Department: Obstetrics
    ├── Department: Gynecology
    ├── Department: Pediatrics
    ├── Clinic: Women's Wellness Center
    ├── Clinic: Maternity Center
    └── Clinic: Children's Care Clinic
```

### Clinic Plan Flow
```
User Registration
    ↓
Subscription (Clinic Plan)
    ↓
Clinic (Bright Smile Dental)
    ├── Service: Dental Cleaning
    ├── Service: Tooth Filling
    ├── Service: Root Canal
    └── Capacity: 50 patients, 3 doctors
```

## 📋 Required Data Elements

### 🏢 Company Plan
```json
{
  "userData": { /* User registration */ },
  "subscriptionData": { "planType": "company" },
  "organization": {
    "name": "HealthCorp Medical Group",
    "businessProfile": { /* Required */ },
    "legalInfo": { /* Required */ }
  },
  "complexes": [ /* Multiple allowed */ ],
  "departments": [ /* Required for complexes */ ],
  "clinics": [ /* Optional but common */ ]
}
```

### 🏥 Complex Plan
```json
{
  "userData": { /* User registration */ },
  "subscriptionData": { "planType": "complex" },
  "complexes": [{
    "name": "Al-Zahra Medical Complex",
    "businessProfile": { /* Required */ },
    "legalInfo": { /* Required */ }
  }],
  "departments": [ /* Required */ ],
  "clinics": [ /* Multiple allowed */ ]
}
```

### 🩺 Clinic Plan
```json
{
  "userData": { /* User registration */ },
  "subscriptionData": { "planType": "clinic" },
  "clinics": [{
    "name": "Bright Smile Dental Clinic",
    "capacity": { /* Required */ },
    "businessProfile": { /* Required */ },
    "legalInfo": { /* Required */ }
  }],
  "services": [ /* Clinic-specific services */ ]
}
```

## ⚙️ Working Hours Hierarchy

### Company Plan Hierarchy
```
Organization Hours: 08:00 - 22:00
    ├── Complex Hours: 09:00 - 21:00 ✅ (within org hours)
    └── Clinic Hours: 10:00 - 16:30 ✅ (within complex hours)
```

### Complex Plan Hierarchy  
```
Complex Hours: 07:00 - 23:00
    └── Clinic Hours: 09:00 - 18:00 ✅ (within complex hours)
```

### Clinic Plan (No Hierarchy)
```
Clinic Hours: 09:00 - 18:00 ✅ (independent)
```

## 💰 Typical Use Cases & Pricing

### 🏢 Company Plan - Enterprise Healthcare
- **Target**: Large healthcare organizations
- **Features**: Multi-location management, corporate branding
- **Examples**: 
  - Hospital chains
  - Healthcare networks
  - Multi-city medical groups

### 🏥 Complex Plan - Specialized Medical Centers
- **Target**: Medium-sized medical complexes
- **Features**: Department-based organization, specialized care
- **Examples**:
  - Women's health centers
  - Cardiac care complexes
  - Specialized surgical centers

### 🩺 Clinic Plan - Independent Practices
- **Target**: Individual practitioners and small clinics
- **Features**: Simple management, direct patient care
- **Examples**:
  - Dental clinics
  - Family medicine practices
  - Specialty clinics

## 🔍 Key Validation Rules

### Company Plan Validations
- ✅ Must have organization
- ✅ Organization requires business profile
- ✅ Complexes must have departments
- ✅ Working hours: Clinic ⊆ Complex ⊆ Organization

### Complex Plan Validations
- ✅ Must have at least one complex
- ✅ Complex requires business profile and legal info
- ✅ Must have departments
- ✅ Working hours: Clinic ⊆ Complex

### Clinic Plan Validations
- ✅ Must have exactly one clinic
- ✅ Clinic requires capacity settings
- ✅ Must specify maxPatients and sessionDuration
- ✅ Clinic requires business profile and legal info

## 🚀 API Examples

### Company Plan API Call
```bash
POST /onboarding/complete
{
  "subscriptionData": { "planType": "company" },
  "organization": { "name": "HealthCorp" },
  "complexes": [{ "name": "Riyadh Complex" }],
  "departments": [{ "name": "Cardiology" }]
}
```

### Complex Plan API Call
```bash
POST /onboarding/complete
{
  "subscriptionData": { "planType": "complex" },
  "complexes": [{ 
    "name": "Al-Zahra Complex",
    "businessProfile": { "yearEstablished": 2015 }
  }],
  "departments": [{ "name": "Obstetrics" }]
}
```

### Clinic Plan API Call  
```bash
POST /onboarding/complete
{
  "subscriptionData": { "planType": "clinic" },
  "clinics": [{
    "name": "Bright Smile Dental",
    "capacity": { "maxPatients": 50, "sessionDuration": 45 },
    "businessProfile": { "yearEstablished": 2020 }
  }]
}
```

## ✅ Success Criteria

### All Plans Must Include:
1. **Valid user registration data**
2. **Active subscription plan**
3. **Complete contact information**
4. **Working hours within plan constraints**
5. **Legal compliance (VAT, CR numbers)**

### Plan-Specific Requirements:
- **Company**: Organization structure with complexes
- **Complex**: Complex with departments and business profile  
- **Clinic**: Clinic with capacity management and services
