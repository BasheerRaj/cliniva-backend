/**
 * Example error response when department is not found
 * Error Code: DEPARTMENT_003
 * Used in Swagger documentation
 */
export const deleteNotFoundExample = {
  success: false,
  error: {
    code: 'DEPARTMENT_003',
    message: {
      ar: 'القسم غير موجود',
      en: 'Department not found',
    },
  },
};
