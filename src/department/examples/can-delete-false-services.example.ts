/**
 * Example response when department cannot be deleted due to services
 * Used in Swagger documentation for can-delete endpoint
 */
export const canDeleteFalseServicesExample = {
  success: true,
  data: {
    canDelete: false,
    reason: {
      ar: 'لا يمكن حذف القسم لأنه يحتوي على 5 خدمات',
      en: 'Cannot delete department because it has 5 services',
    },
    linkedServices: 5,
    recommendations: {
      ar: 'يرجى إزالة القسم من جميع العيادات والخدمات المرتبطة قبل الحذف',
      en: 'Please remove the department from all linked clinics and services before deletion',
    },
  },
};
