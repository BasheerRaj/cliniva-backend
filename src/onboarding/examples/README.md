# Onboarding Data Examples

This directory contains comprehensive examples of onboarding data for each subscription plan type.

## 📋 Plan Types

### 🏢 **Company Plan**
- **Use Case**: Large healthcare organizations with multiple complexes and clinics
- **Structure**: Organization → Complexes → Departments → Clinics
- **Example**: HealthCorp Medical Group with locations in Riyadh and Jeddah

### 🏥 **Complex Plan** 
- **Use Case**: Medical complexes with multiple specialized departments
- **Structure**: Complex → Departments → Clinics
- **Example**: Al-Zahra Medical Complex specializing in women's and children's health

### 🩺 **Clinic Plan**
- **Use Case**: Independent clinics or specialized practices
- **Structure**: Single Clinic with services
- **Example**: Bright Smile Dental Clinic

## 🚀 API Usage

### Complete Onboarding Endpoint
```
POST /onboarding/complete
Content-Type: application/json
```

### Example API Calls

#### Company Plan
```bash
curl -X POST http://localhost:3000/onboarding/complete \
  -H "Content-Type: application/json" \
  -d @examples/company-plan.json
```

#### Complex Plan  
```bash
curl -X POST http://localhost:3000/onboarding/complete \
  -H "Content-Type: application/json" \
  -d @examples/complex-plan.json
```

#### Clinic Plan
```bash
curl -X POST http://localhost:3000/onboarding/complete \
  -H "Content-Type: application/json" \
  -d @examples/clinic-plan.json
```

## 📊 Data Structure Comparison

| Feature | Company Plan | Complex Plan | Clinic Plan |
|---------|-------------|-------------|-------------|
| Organization | ✅ Required | ❌ Not used | ❌ Not used |
| Complexes | ✅ Multiple | ✅ Single | ❌ Not used |
| Departments | ✅ Multiple | ✅ Multiple | ❌ Not used |
| Clinics | ✅ Multiple | ✅ Multiple | ✅ Single |
| Business Profile | ✅ Organization level | ✅ Complex level | ✅ Clinic level |
| Legal Info | ✅ Organization level | ✅ Complex level | ✅ Clinic level |
| Capacity Management | ✅ Per clinic | ✅ Per clinic | ✅ Required |

## 🔍 Key Differences

### Company Plan
```json
{
  "organization": { "name": "HealthCorp Medical Group" },
  "complexes": [
    { "name": "Riyadh Complex", "departmentIds": ["cardiology", "pediatrics"] },
    { "name": "Jeddah Complex", "departmentIds": ["cardiology", "gynecology"] }
  ],
  "departments": [
    { "name": "Cardiology" },
    { "name": "Pediatrics" }
  ],
  "clinics": [
    { "name": "Heart Center", "complexDepartmentId": "complex_dept_cardiology_riyadh" }
  ]
}
```

### Complex Plan
```json
{
  "organization": null,
  "complexes": [
    { 
      "name": "Al-Zahra Medical Complex",
      "businessProfile": { "yearEstablished": 2015 },
      "legalInfo": { "vatNumber": "300987654321002" }
    }
  ],
  "departments": [
    { "name": "Obstetrics" },
    { "name": "Gynecology" }
  ]
}
```

### Clinic Plan
```json
{
  "organization": null,
  "complexes": null,
  "departments": null,
  "clinics": [
    {
      "name": "Bright Smile Dental Clinic",
      "capacity": {
        "maxStaff": 8,
        "maxDoctors": 3,
        "maxPatients": 50,
        "sessionDuration": 45
      },
      "businessProfile": { "yearEstablished": 2020 },
      "legalInfo": { "vatNumber": "300555666777003" }
    }
  ]
}
```

## ✅ Validation Rules

### Working Hours Hierarchy
- **Company Plan**: Organization → Complex → Clinic hours must be within parent hours
- **Complex Plan**: Complex → Clinic hours must be within complex hours  
- **Clinic Plan**: No hierarchy validation needed

### Required Fields by Plan

#### Company Plan
- ✅ `organization.name` (required)
- ✅ `organization.subscriptionId` (required)
- ✅ At least one complex
- ✅ At least one department

#### Complex Plan  
- ✅ `complexes[0].name` (required)
- ✅ `complexes[0].subscriptionId` (required)
- ✅ `complexes[0].businessProfile` (required)
- ✅ `complexes[0].legalInfo` (required)
- ✅ At least one department

#### Clinic Plan
- ✅ `clinics[0].name` (required)
- ✅ `clinics[0].subscriptionId` (required)
- ✅ `clinics[0].capacity.maxPatients` (required)
- ✅ `clinics[0].capacity.sessionDuration` (required)
- ✅ `clinics[0].businessProfile` (required)
- ✅ `clinics[0].legalInfo` (required)

## 🔧 Testing

### Validate Data Before Submission
```bash
POST /onboarding/validate
{
  "userData": { ... },
  "subscriptionData": { "planType": "company" },
  "organization": { ... }
}
```

### Check Available Plans
```bash
GET /onboarding/plans
```

## 🎯 Common Use Cases

### 1. Large Healthcare Organization (Company Plan)
- Multiple cities/regions
- Different medical specialties per location
- Centralized management and branding
- Corporate legal structure

### 2. Specialized Medical Complex (Complex Plan)
- Single location with multiple departments
- Focused specialty (e.g., women's health, cardiology)
- Independent business entity
- Department-based organization

### 3. Independent Practice (Clinic Plan)
- Single specialty focus
- Limited capacity management
- Direct patient care
- Streamlined operations

## 🚨 Common Errors

### Invalid Hierarchy
```json
// ❌ Clinic trying to work when complex is closed
{
  "complexWorkingHours": { "friday": { "isWorkingDay": false } },
  "clinicWorkingHours": { "friday": { "isWorkingDay": true } }
}
```

### Missing Required Data
```json
// ❌ Company plan without organization
{
  "subscriptionData": { "planType": "company" },
  "organization": null  // This will fail validation
}
```

### Invalid Capacity
```json
// ❌ Clinic plan without capacity settings
{
  "subscriptionData": { "planType": "clinic" },
  "clinics": [{ 
    "name": "Test Clinic"
    // Missing capacity object - will fail
  }]
}
```

## 📞 Support

For questions about onboarding data structure:
1. Check the validation endpoint first: `POST /onboarding/validate`
2. Review the plan requirements in this document
3. Test with the provided examples
4. Check error messages for specific validation failures
