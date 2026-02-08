/**
 * Swagger Examples for Appointment Module
 * Contains example request/response objects for API documentation
 */

export const SWAGGER_EXAMPLES = {
  // Success Response Examples
  CREATE_SUCCESS: {
    success: true,
    message: 'Appointment created successfully',
    data: {
      _id: '507f1f77bcf86cd799439011',
      patientId: '507f1f77bcf86cd799439012',
      doctorId: '507f1f77bcf86cd799439013',
      clinicId: '507f1f77bcf86cd799439014',
      serviceId: '507f1f77bcf86cd799439015',
      appointmentDate: '2026-02-15T00:00:00.000Z',
      appointmentTime: '14:30',
      durationMinutes: 30,
      status: 'scheduled',
      urgencyLevel: 'medium',
      notes: 'Patient has mild symptoms',
      createdBy: '507f1f77bcf86cd799439016',
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T10:00:00.000Z',
    },
  },

  GET_SUCCESS: {
    success: true,
    message: 'Appointment retrieved successfully',
    data: {
      _id: '507f1f77bcf86cd799439011',
      patientId: {
        _id: '507f1f77bcf86cd799439012',
        firstName: 'Ahmed',
        lastName: 'Al-Sayed',
        phone: '+966501234567',
        email: 'ahmed.alsayed@example.com',
        dateOfBirth: '1985-05-15',
      },
      doctorId: {
        _id: '507f1f77bcf86cd799439013',
        firstName: 'Dr. Fatima',
        lastName: 'Al-Rashid',
        email: 'fatima.rashid@clinic.com',
        phone: '+966507654321',
      },
      clinicId: {
        _id: '507f1f77bcf86cd799439014',
        name: 'Riyadh Medical Center',
        address: 'King Fahd Road, Riyadh',
        phone: '+966112345678',
      },
      serviceId: {
        _id: '507f1f77bcf86cd799439015',
        name: 'General Consultation',
        description: 'General medical consultation and examination',
        durationMinutes: 30,
        price: 200,
      },
      appointmentDate: '2026-02-15T00:00:00.000Z',
      appointmentTime: '14:30',
      durationMinutes: 30,
      status: 'scheduled',
      urgencyLevel: 'medium',
      notes: 'Patient has mild symptoms',
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T10:00:00.000Z',
    },
  },

  LIST_SUCCESS: {
    success: true,
    message: 'Appointments retrieved successfully',
    data: [
      {
        _id: '507f1f77bcf86cd799439011',
        patientId: {
          _id: '507f1f77bcf86cd799439012',
          firstName: 'Ahmed',
          lastName: 'Al-Sayed',
          phone: '+966501234567',
        },
        doctorId: {
          _id: '507f1f77bcf86cd799439013',
          firstName: 'Dr. Fatima',
          lastName: 'Al-Rashid',
        },
        clinicId: {
          _id: '507f1f77bcf86cd799439014',
          name: 'Riyadh Medical Center',
        },
        serviceId: {
          _id: '507f1f77bcf86cd799439015',
          name: 'General Consultation',
          durationMinutes: 30,
        },
        appointmentDate: '2026-02-15T00:00:00.000Z',
        appointmentTime: '14:30',
        status: 'scheduled',
        urgencyLevel: 'medium',
      },
      {
        _id: '507f1f77bcf86cd799439021',
        patientId: {
          _id: '507f1f77bcf86cd799439022',
          firstName: 'Sara',
          lastName: 'Mohammed',
          phone: '+966509876543',
        },
        doctorId: {
          _id: '507f1f77bcf86cd799439013',
          firstName: 'Dr. Fatima',
          lastName: 'Al-Rashid',
        },
        clinicId: {
          _id: '507f1f77bcf86cd799439014',
          name: 'Riyadh Medical Center',
        },
        serviceId: {
          _id: '507f1f77bcf86cd799439025',
          name: 'Follow-up Visit',
          durationMinutes: 20,
        },
        appointmentDate: '2026-02-15T00:00:00.000Z',
        appointmentTime: '15:00',
        status: 'confirmed',
        urgencyLevel: 'low',
      },
    ],
    pagination: {
      total: 45,
      page: 1,
      totalPages: 5,
      limit: 10,
    },
  },

  UPDATE_SUCCESS: {
    success: true,
    message: 'Appointment updated successfully',
    data: {
      _id: '507f1f77bcf86cd799439011',
      patientId: '507f1f77bcf86cd799439012',
      doctorId: '507f1f77bcf86cd799439013',
      clinicId: '507f1f77bcf86cd799439014',
      serviceId: '507f1f77bcf86cd799439015',
      appointmentDate: '2026-02-16T00:00:00.000Z',
      appointmentTime: '10:00',
      durationMinutes: 45,
      status: 'confirmed',
      urgencyLevel: 'high',
      notes: 'Updated appointment time and urgency',
      updatedBy: '507f1f77bcf86cd799439016',
      createdAt: '2026-02-07T10:00:00.000Z',
      updatedAt: '2026-02-07T11:30:00.000Z',
    },
  },

  DELETE_SUCCESS: {
    success: true,
    message: 'Appointment deleted successfully',
  },

  RESCHEDULE_SUCCESS: {
    success: true,
    message: 'Appointment rescheduled successfully',
    data: {
      _id: '507f1f77bcf86cd799439011',
      patientId: '507f1f77bcf86cd799439012',
      doctorId: '507f1f77bcf86cd799439013',
      clinicId: '507f1f77bcf86cd799439014',
      serviceId: '507f1f77bcf86cd799439015',
      appointmentDate: '2026-02-20T00:00:00.000Z',
      appointmentTime: '09:00',
      durationMinutes: 30,
      status: 'scheduled',
      urgencyLevel: 'medium',
      notes: 'Rescheduled: Patient requested earlier time',
      updatedAt: '2026-02-07T12:00:00.000Z',
    },
  },

  CANCEL_SUCCESS: {
    success: true,
    message: 'Appointment cancelled successfully',
    data: {
      _id: '507f1f77bcf86cd799439011',
      patientId: '507f1f77bcf86cd799439012',
      doctorId: '507f1f77bcf86cd799439013',
      clinicId: '507f1f77bcf86cd799439014',
      serviceId: '507f1f77bcf86cd799439015',
      appointmentDate: '2026-02-15T00:00:00.000Z',
      appointmentTime: '14:30',
      durationMinutes: 30,
      status: 'cancelled',
      urgencyLevel: 'medium',
      cancellationReason: 'Patient unable to attend',
      updatedAt: '2026-02-07T13:00:00.000Z',
    },
  },

  CONFIRM_SUCCESS: {
    success: true,
    message: 'Appointment confirmed successfully',
    data: {
      _id: '507f1f77bcf86cd799439011',
      patientId: '507f1f77bcf86cd799439012',
      doctorId: '507f1f77bcf86cd799439013',
      clinicId: '507f1f77bcf86cd799439014',
      serviceId: '507f1f77bcf86cd799439015',
      appointmentDate: '2026-02-15T00:00:00.000Z',
      appointmentTime: '14:30',
      durationMinutes: 30,
      status: 'confirmed',
      urgencyLevel: 'medium',
      notes: 'Confirmation: Patient confirmed attendance via phone',
      updatedAt: '2026-02-07T14:00:00.000Z',
    },
  },

  AVAILABILITY_SUCCESS: {
    success: true,
    message: 'Doctor availability retrieved successfully',
    data: {
      date: '2026-02-15',
      doctorId: '507f1f77bcf86cd799439013',
      clinicId: '507f1f77bcf86cd799439014',
      workingHours: {
        start: '09:00',
        end: '17:00',
        breaks: [
          {
            start: '12:00',
            end: '13:00',
          },
        ],
      },
      timeSlots: [
        {
          time: '09:00',
          isAvailable: true,
        },
        {
          time: '09:30',
          isAvailable: true,
        },
        {
          time: '10:00',
          isAvailable: false,
          reason: 'Already booked',
          existingAppointmentId: '507f1f77bcf86cd799439020',
        },
        {
          time: '10:30',
          isAvailable: true,
        },
        {
          time: '11:00',
          isAvailable: true,
        },
        {
          time: '11:30',
          isAvailable: true,
        },
        {
          time: '13:00',
          isAvailable: true,
        },
        {
          time: '13:30',
          isAvailable: false,
          reason: 'Already booked',
          existingAppointmentId: '507f1f77bcf86cd799439021',
        },
      ],
      totalSlots: 14,
      availableSlots: 10,
      bookedSlots: 4,
    },
  },

  STATS_SUCCESS: {
    success: true,
    message: 'Appointment statistics retrieved successfully',
    data: {
      totalAppointments: 1250,
      scheduledAppointments: 180,
      confirmedAppointments: 95,
      completedAppointments: 850,
      cancelledAppointments: 100,
      noShowAppointments: 25,
      todayAppointments: 15,
      upcomingAppointments: 275,
      overdueAppointments: 0,
      averageDuration: 32.5,
      topServices: [
        {
          serviceId: '507f1f77bcf86cd799439015',
          serviceName: 'General Consultation',
          count: 450,
        },
        {
          serviceId: '507f1f77bcf86cd799439025',
          serviceName: 'Follow-up Visit',
          count: 320,
        },
        {
          serviceId: '507f1f77bcf86cd799439035',
          serviceName: 'Specialist Consultation',
          count: 280,
        },
      ],
      topDoctors: [
        {
          doctorId: '507f1f77bcf86cd799439013',
          doctorName: 'Dr. Fatima Al-Rashid',
          count: 380,
        },
        {
          doctorId: '507f1f77bcf86cd799439023',
          doctorName: 'Dr. Mohammed Al-Zahrani',
          count: 340,
        },
        {
          doctorId: '507f1f77bcf86cd799439033',
          doctorName: 'Dr. Layla Al-Otaibi',
          count: 290,
        },
      ],
      urgencyDistribution: {
        low: 450,
        medium: 620,
        high: 150,
        urgent: 30,
      },
    },
  },

  CONFLICT_CHECK_SUCCESS: {
    success: true,
    message: 'Conflict check completed',
    data: {
      hasConflicts: true,
      conflicts: [
        {
          conflictType: 'doctor_busy',
          message: 'Doctor has another appointment at this time',
          conflictingAppointmentId: '507f1f77bcf86cd799439020',
        },
      ],
      conflictCount: 1,
    },
  },

  CONFLICT_CHECK_NO_CONFLICTS: {
    success: true,
    message: 'Conflict check completed',
    data: {
      hasConflicts: false,
      conflicts: [],
      conflictCount: 0,
    },
  },

  // Error Response Examples
  VALIDATION_ERROR: {
    success: false,
    message: 'Failed to create appointment',
    error: 'Validation failed',
  },

  UNAUTHORIZED_ERROR: {
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: {
        ar: 'غير مصرح لك بالوصول',
        en: 'Unauthorized access',
      },
    },
  },

  NOT_FOUND_ERROR: {
    success: false,
    message: 'Failed to retrieve appointment',
    error: 'Appointment not found',
  },

  CONFLICT_ERROR: {
    success: false,
    message: 'Failed to create appointment',
    error:
      'Appointment conflicts detected: Doctor has another appointment at this time',
  },

  INVALID_STATUS_ERROR: {
    success: false,
    message: 'Failed to update appointment',
    error: 'Cannot reschedule appointment with current status',
  },

  PAST_DATE_ERROR: {
    success: false,
    message: 'Failed to create appointment',
    error: 'Cannot schedule appointments in the past',
  },

  INVALID_ID_ERROR: {
    success: false,
    message: 'Failed to retrieve appointment',
    error: 'Invalid appointment ID format',
  },
};

