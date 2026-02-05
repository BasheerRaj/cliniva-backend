/**
 * Example error response when department has services
 * Error Code: DEPARTMENT_002
 * Used in Swagger documentation
 */
export const deleteHasServicesExample = {
  success: false,
  error: {
    code: 'DEPARTMENT_002',
    message: {
      ar: 'لا يمكن حذف القسم لأنه يحتوي على خدمات',
      en: 'Cannot delete department because it has services',
    },
    linkedServices: 5,
  },
};
