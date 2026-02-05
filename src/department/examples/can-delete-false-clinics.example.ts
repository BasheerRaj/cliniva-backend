/**
 * Example response when department cannot be deleted due to linked clinics
 * Used in Swagger documentation for can-delete endpoint
 */
export const canDeleteFalseClinicsExample = {
  success: true,
  data: {
    canDelete: false,
    reason: {
      ar: 'لا يمكن حذف القسم لأنه مرتبط بـ 3 عيادات',
      en: 'Cannot delete department because it is linked to 3 clinics',
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
    linkedServices: 5,
    recommendations: {
      ar: 'يرجى إزالة القسم من جميع العيادات والخدمات المرتبطة قبل الحذف',
      en: 'Please remove the department from all linked clinics and services before deletion',
    },
  },
};
