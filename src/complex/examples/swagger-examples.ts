/**
 * Swagger Examples for Complex Management API
 * 
 * This file contains reusable examples for API documentation.
 * All examples include bilingual messages and follow the standard response format.
 */

/**
 * Error Code Examples
 * Demonstrates all possible error responses with their codes
 */
export const ERROR_EXAMPLES = {
  COMPLEX_001: {
    success: false,
    error: {
      code: 'COMPLEX_001',
      message: {
        ar: 'تم تجاوز حد الخطة. الخطة المعقدة تسمح بمجمع واحد كحد أقصى',
        en: 'Plan limit exceeded. Complex plan allows maximum 1 complex',
      },
    },
  },
  COMPLEX_002: {
    success: false,
    error: {
      code: 'COMPLEX_002',
      message: {
        ar: 'الشخص المسؤول غير صالح. يجب أن يكون موظفًا في المجمع',
        en: 'Invalid person-in-charge. Must be an employee of the complex',
      },
    },
  },
  COMPLEX_003: {
    success: false,
    error: {
      code: 'COMPLEX_003',
      message: {
        ar: 'لا يمكن حذف المجمع مع وجود عيادات نشطة',
        en: 'Cannot delete complex with active clinics',
      },
    },
  },
  COMPLEX_004: {
    success: false,
    error: {
      code: 'COMPLEX_004',
      message: {
        ar: 'يجب نقل العيادات قبل إلغاء التنشيط',
        en: 'Must transfer clinics before deactivation',
      },
    },
  },
  COMPLEX_005: {
    success: false,
    error: {
      code: 'COMPLEX_005',
      message: {
        ar: 'المجمع المستهدف غير صالح للنقل',
        en: 'Invalid target complex for transfer',
      },
    },
  },
  COMPLEX_006: {
    success: false,
    error: {
      code: 'COMPLEX_006',
      message: {
        ar: 'المجمع غير موجود',
        en: 'Complex not found',
      },
    },
  },
  COMPLEX_007: {
    success: false,
    error: {
      code: 'COMPLEX_007',
      message: {
        ar: 'القسم مرتبط بعيادات ولا يمكن إزالته',
        en: 'Department linked to clinics and cannot be removed',
      },
      details: {
        departmentRestrictions: [
          {
            departmentId: '507f1f77bcf86cd799439015',
            departmentName: 'Cardiology',
            linkedClinics: [
              {
                clinicId: '507f1f77bcf86cd799439020',
                clinicName: 'Cardiology Clinic A',
              },
            ],
          },
        ],
      },
    },
  },
  COMPLEX_008: {
    success: false,
    error: {
      code: 'COMPLEX_008',
      message: {
        ar: 'الاشتراك غير نشط',
        en: 'Subscription is not active',
      },
    },
  },
  COMPLEX_009: {
    success: false,
    error: {
      code: 'COMPLEX_009',
      message: {
        ar: 'تنسيق البريد الإلكتروني غير صالح',
        en: 'Invalid email format',
      },
    },
  },
  COMPLEX_010: {
    success: false,
    error: {
      code: 'COMPLEX_010',
      message: {
        ar: 'تنسيق رقم الهاتف غير صالح',
        en: 'Invalid phone format',
      },
    },
  },
};

/**
 * Success Response Examples
 */
export const SUCCESS_EXAMPLES = {
  UPDATE_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      name: 'Updated Medical Complex',
      status: 'active',
      email: 'updated@centralmedical.com',
      updatedAt: '2024-01-20T15:30:00.000Z',
    },
    message: {
      ar: 'تم تحديث المجمع بنجاح',
      en: 'Complex updated successfully',
    },
  },
  DELETE_SUCCESS: {
    success: true,
    message: {
      ar: 'تم حذف المجمع بنجاح',
      en: 'Complex deleted successfully',
    },
  },
  STATUS_CHANGE_SUCCESS: {
    success: true,
    data: {
      complex: {
        _id: '507f1f77bcf86cd799439011',
        name: 'Central Medical Complex',
        status: 'inactive',
        deactivatedAt: '2024-01-20T15:30:00.000Z',
        deactivationReason: 'Temporary closure for renovation',
      },
      servicesDeactivated: 25,
      clinicsTransferred: 8,
      appointmentsMarkedForRescheduling: 15,
    },
    message: {
      ar: 'تم تحديث حالة المجمع بنجاح',
      en: 'Complex status updated successfully',
    },
  },
  CAPACITY_RESPONSE: {
    success: true,
    data: {
      total: {
        maxDoctors: 50,
        maxStaff: 100,
        maxPatients: 500,
      },
      current: {
        doctors: 35,
        staff: 75,
        patients: 320,
      },
      utilization: {
        doctors: 70,
        staff: 75,
        patients: 64,
      },
      byClinic: [
        {
          clinicId: '507f1f77bcf86cd799439020',
          clinicName: 'Cardiology Clinic',
          maxDoctors: 10,
          maxStaff: 20,
          maxPatients: 100,
          currentDoctors: 8,
          currentStaff: 15,
          currentPatients: 65,
        },
      ],
      recommendations: [],
    },
    message: {
      ar: 'تم حساب سعة المجمع بنجاح',
      en: 'Complex capacity calculated successfully',
    },
  },
  PIC_ASSIGN_SUCCESS: {
    success: true,
    data: {
      _id: '507f1f77bcf86cd799439011',
      name: 'Central Medical Complex',
      personInChargeId: '507f1f77bcf86cd799439014',
      personInCharge: {
        _id: '507f1f77bcf86cd799439014',
        firstName: 'Ahmed',
        lastName: 'Al-Saud',
        email: 'ahmed@centralmedical.com',
      },
    },
    message: {
      ar: 'تم تعيين الشخص المسؤول بنجاح',
      en: 'Person-in-charge assigned successfully',
    },
  },
  PIC_REMOVE_SUCCESS: {
    success: true,
    message: {
      ar: 'تم إزالة الشخص المسؤول بنجاح',
      en: 'Person-in-charge removed successfully',
    },
  },
  TRANSFER_SUCCESS: {
    success: true,
    data: {
      clinicsTransferred: 5,
      staffUpdated: 25,
      appointmentsMarkedForRescheduling: 12,
      conflicts: [
        {
          clinicId: '507f1f77bcf86cd799439020',
          clinicName: 'Cardiology Clinic',
          conflictType: 'working_hours_mismatch',
          details: 'Source complex operates 8AM-8PM, target complex operates 9AM-5PM',
        },
      ],
    },
    message: {
      ar: 'تم نقل العيادات بنجاح',
      en: 'Clinics transferred successfully',
    },
  },
};
