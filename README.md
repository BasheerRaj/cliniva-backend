# Cliniva Backend

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/TypeORM-000000?style=for-the-badge&logo=typeorm&logoColor=white" alt="TypeORM" />
</p>

## 🏥 Overview

**Cliniva Backend** is a comprehensive, enterprise-grade clinic management system API built with NestJS and TypeScript. It provides a robust foundation for managing multi-tenant healthcare operations, from individual clinics to large healthcare organizations.

## ✨ Key Features

### 🏢 **Multi-Tenant Architecture**
- **Flexible Subscription Plans**: Company, Complex, and Clinic-level subscriptions
- **Hierarchical Organization**: Organization → Complexes → Departments → Clinics
- **Unified Access Control**: Role-based permissions across all organizational levels

### 🩺 **Core Healthcare Operations**
- **Patient Management**: Comprehensive patient records with medical history
- **Appointment Scheduling**: Advanced booking system with service integration
- **Medical Reports**: Digital medical records with audit trails
- **Doctor Specialties**: Multi-specialty support with certifications

### 💰 **Financial Management**
- **Invoice Management**: Automated billing with line items and tax calculation
- **Payment Processing**: Multiple payment methods with reference tracking
- **Insurance Claims**: Complete workflow from submission to approval
- **Discount System**: Flexible offers and promotions

### 🔔 **Communication System**
- **Multi-Channel Notifications**: In-app, email, SMS, and push notifications
- **Template Management**: Customizable email and SMS templates
- **Smart Scheduling**: Automated appointment reminders and alerts
- **Priority Handling**: Urgent notifications for critical situations

### 🔍 **Enterprise Security**
- **Comprehensive Audit Trails**: Complete change tracking with JSON storage
- **Soft Delete Support**: Data recovery capabilities
- **User Activity Monitoring**: IP address and user agent tracking
- **Medical Record Versioning**: Compliance-ready version control

### ⚙️ **Operational Excellence**
- **Dynamic Information System**: Flexible data storage for custom fields
- **Working Hours Management**: Configurable schedules with break times
- **Employee Shift System**: Detailed scheduling across organizational entities
- **Contact Management**: Social media and communication channels

## 🛠 Technology Stack

- **Framework**: [NestJS](https://nestjs.com/) - Progressive Node.js framework
- **Language**: [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- **Database**: [MySQL](https://www.mysql.com/) - Relational database
- **ORM**: [TypeORM](https://typeorm.io/) - TypeScript ORM
- **Validation**: [Class Validator](https://github.com/typestack/class-validator) - Decorator-based validation
- **Documentation**: [Swagger/OpenAPI](https://swagger.io/) - API documentation
- **Testing**: [Jest](https://jestjs.io/) - JavaScript testing framework
- **Linting**: [ESLint](https://eslint.org/) - Code quality and style

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v8 or higher) 
- **MySQL** (v8.0 or higher)
- **Git** (for version control)

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd cliniva-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:

```env
# Application
NODE_ENV=development
PORT=3000
APP_NAME=Cliniva Backend

# Database Configuration
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=cliniva_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS Configuration (Optional)
SMS_API_KEY=your-sms-api-key
SMS_SENDER_ID=CLINIVA

# File Upload (Future)
UPLOAD_DEST=./uploads
MAX_FILE_SIZE=10485760

# Redis (Optional - for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 4. Database Setup

#### Create Database
```sql
CREATE DATABASE cliniva_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Run Migrations
```bash
# Generate migration files
npm run migration:generate -- -n InitialSchema

# Run migrations
npm run migration:run
```

#### Seed Database (Optional)
```bash
npm run seed
```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
# Start with file watching
npm run start:dev

# Start in debug mode
npm run start:debug
```

### Production Mode
```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

The API will be available at `http://localhost:3000`

## 📚 API Documentation

Once the application is running, you can access:

- **Swagger UI**: `http://localhost:3000/api` - Interactive API documentation
- **OpenAPI JSON**: `http://localhost:3000/api-json` - Raw OpenAPI specification

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Generate test coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch
```

## 📁 Project Structure

```
cliniva-backend/
├── src/
│   ├── auth/                 # Authentication & authorization
│   ├── users/                # User management
│   ├── organizations/        # Organization entities
│   ├── complexes/           # Complex management
│   ├── clinics/             # Clinic operations
│   ├── departments/         # Department management
│   ├── patients/            # Patient records
│   ├── appointments/        # Appointment scheduling
│   ├── services/            # Medical services
│   ├── specialties/         # Doctor specialties
│   ├── medical-reports/     # Medical documentation
│   ├── billing/             # Invoice & payment management
│   ├── notifications/       # Communication system
│   ├── common/              # Shared utilities
│   ├── config/              # Configuration modules
│   └── database/            # Database entities & migrations
├── test/                    # Test files
├── docs/                    # Documentation
└── dist/                    # Compiled output
```

## 🗄️ Database Schema

The application uses a comprehensive database schema designed for multi-tenant healthcare operations. See [`../docs/database-schema.md`](../docs/database-schema.md) for detailed schema documentation.

### Key Entities:
- **Organizations & Complexes**: Multi-level organizational structure
- **Users & Access Control**: Role-based permission system
- **Patients & Appointments**: Core healthcare operations
- **Medical Reports**: Digital medical records
- **Billing System**: Invoices, payments, and insurance claims
- **Notifications**: Multi-channel communication

## 🔄 Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/appointment-scheduling

# Make changes and commit
git add .
git commit -m "feat: add appointment scheduling module"

# Push to remote
git push origin feature/appointment-scheduling
```

### 2. Database Changes
```bash
# Generate migration for schema changes
npm run migration:generate -- -n AddAppointmentReminders

# Review and edit migration file
# Run migration
npm run migration:run
```

### 3. Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## 📋 Implementation Phases

### Phase 1: Core Operations ✅
- [x] User authentication & authorization
- [x] Organization & clinic management
- [x] Patient registration & management
- [x] Appointment scheduling
- [x] Medical reports

### Phase 2: Financial Management 🚧
- [ ] Invoice generation
- [ ] Payment processing
- [ ] Insurance claim management
- [ ] Financial reporting

### Phase 3: Communication System 📅
- [ ] Notification system
- [ ] Email & SMS templates
- [ ] Appointment reminders
- [ ] Multi-channel delivery

### Phase 4: Advanced Features 🔮
- [ ] Patient portal integration
- [ ] Advanced analytics
- [ ] Mobile app support
- [ ] Third-party integrations

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

## 📞 Support

For support and questions:

- **Issues**: [GitHub Issues](https://github.com/your-org/cliniva-backend/issues)
- **Documentation**: [Project Wiki](https://github.com/your-org/cliniva-backend/wiki)
- **Email**: support@cliniva.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Acknowledgments

- [NestJS](https://nestjs.com/) - The progressive Node.js framework
- [TypeORM](https://typeorm.io/) - Amazing TypeScript ORM
- [Class Validator](https://github.com/typestack/class-validator) - Validation made easy

---

<p align="center">
  Made with ❤️ for better healthcare management
</p>