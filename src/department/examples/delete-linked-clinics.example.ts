/**
 * Example error response when department is linked to clinics
 * Error Code: DEPARTMENT_001
 * Used in Swagger documentation
 */
export const deleteLinkedClinicsExample = {
  success: false,
  error: {
    code: 'DEPARTMENT_001',
    message: {
      ar: 'لا يمكن حذف القسم لأنه مرتبط بعيادة',
      en: 'Cannot delete department because it is linked to a clinic',
    },
    linkedClinics: [
      {
        clinicId: '507f1f77bcf86cd799439011',
        clinicName: 'Cardiology Clinic A',
        complexName: 'Medical Complex 1',
        complexId: '507f1f77bcf86cd799439012',
      },
      {
        clinicId: '507f1f77bcf86cd799439013',
        clinicName: 'Cardiology Clinic B',
        complexName: 'Medical Complex 1',
        complexId: '507f1f77bcf86cd799439012',
      },
      {
        clinicId: '507f1f77bcf86cd799439014',
        clinicName: 'Neurology Clinic',
        complexName: 'Medical Complex 2',
        complexId: '507f1f77bcf86cd799439015',
      },
    ],
    linkedClinicsCount: 3,
  },
};
