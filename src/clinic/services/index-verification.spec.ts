import { ClinicSchema } from '../../database/schemas/clinic.schema';
import { UserSchema } from '../../database/schemas/user.schema';
import { AppointmentSchema } from '../../database/schemas/appointment.schema';

describe('Database Index Verification', () => {
  describe('Clinic Schema Indexes', () => {
    it('should have status index', () => {
      const indexes = ClinicSchema.indexes();
      const statusIndex = indexes.find((idx: any) => {
        const keys = Object.keys(idx[0]);
        return keys.includes('status') && keys.length === 1;
      });
      expect(statusIndex).toBeDefined();
    });

    it('should have personInChargeId index', () => {
      const indexes = ClinicSchema.indexes();
      const picIndex = indexes.find((idx: any) => {
        const keys = Object.keys(idx[0]);
        return keys.includes('personInChargeId') && keys.length === 1;
      });
      expect(picIndex).toBeDefined();
    });

    it('should have complexId + status composite index', () => {
      const indexes = ClinicSchema.indexes();
      const compositeIndex = indexes.find((idx: any) => {
        const keys = Object.keys(idx[0]);
        return (
          keys.includes('complexId') &&
          keys.includes('status') &&
          keys.length === 2
        );
      });
      expect(compositeIndex).toBeDefined();
    });

    it('should have subscriptionId + status composite index', () => {
      const indexes = ClinicSchema.indexes();
      const compositeIndex = indexes.find((idx: any) => {
        const keys = Object.keys(idx[0]);
        return (
          keys.includes('subscriptionId') &&
          keys.includes('status') &&
          keys.length === 2
        );
      });
      expect(compositeIndex).toBeDefined();
    });
  });

  describe('User Schema Indexes', () => {
    it('should have clinicId + role + isActive composite index', () => {
      const indexes = UserSchema.indexes();
      const compositeIndex = indexes.find((idx: any) => {
        const keys = Object.keys(idx[0]);
        return (
          keys.includes('clinicId') &&
          keys.includes('role') &&
          keys.includes('isActive') &&
          keys.length === 3
        );
      });
      expect(compositeIndex).toBeDefined();
    });
  });

  describe('Appointment Schema Indexes', () => {
    it('should have clinicId + deletedAt composite index', () => {
      const indexes = AppointmentSchema.indexes();
      const compositeIndex = indexes.find((idx: any) => {
        const keys = Object.keys(idx[0]);
        return (
          keys.includes('clinicId') &&
          keys.includes('deletedAt') &&
          keys.length === 2
        );
      });
      expect(compositeIndex).toBeDefined();
    });
  });
});
