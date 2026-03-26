/**
 * Appointment Transformer Utility
 *
 * Normalizes Mongoose-populated appointment documents into the frontend-expected
 * shape. Apply this to ALL endpoints that return appointment data to ensure
 * the frontend receives a consistent, flat response format.
 *
 * Transforms:
 *   - patientId: { firstName, lastName, ... } → patient: { name, publicId, ... }
 *   - doctorId: { firstName, lastName, ... }  → doctor: { name, ... }
 *   - serviceId: { durationMinutes, ... }     → service: { duration, ... }
 *   - clinicId: { name, ... }                → clinic: { name, ... }
 *   - appointmentDate + appointmentTime       → datetime (ISO local string)
 *
 * Note: Appointment times are stored as local clinic time. No UTC conversion applied.
 */

export interface TransformedAppointmentPatient {
  _id: string;
  name: string;
  publicId: string; // "PAT-" + last 5 chars of _id uppercased
  phone: string | null;
  email: string | null;
  photo: string | null;
}

export interface TransformedAppointmentDoctor {
  _id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
}

export interface TransformedAppointmentService {
  _id: string;
  name: string;
  duration: number; // minutes (mapped from durationMinutes)
  description: string | null;
  price: number | null;
  sessions?: any[];
}

export interface TransformedAppointmentClinic {
  _id: string;
  name: string;
}

export interface TransformedAppointment {
  _id: string;
  publicId: string; // "APPT-" + last 5 chars of _id uppercased
  patient: TransformedAppointmentPatient;
  doctor: TransformedAppointmentDoctor;
  service: TransformedAppointmentService;
  clinic: TransformedAppointmentClinic;
  datetime: string; // combined ISO local string "YYYY-MM-DDThh:mm:00.000"
  status: string;
  urgency: string | null;
  notes: string | null;
  cancellationReason: string | null;
  completionNotes: string | null;
  invoiceId: string | null;
  sessionId: string | null;
  medicalReportId: string | null;
  isDocumented: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * Build a combined datetime ISO string from a Date and a time string "HH:mm".
 * Appointment times are local clinic time — no UTC conversion.
 */
function buildDatetime(appointmentDate: Date | string | null, appointmentTime: string | null): string {
  if (!appointmentDate || !appointmentTime) return '';
  const dateStr = new Date(appointmentDate).toISOString().split('T')[0]; // "YYYY-MM-DD"
  return `${dateStr}T${appointmentTime}:00.000`;
}

/**
 * Transform a single Mongoose-populated appointment document.
 * Guards against unpopulated (raw ObjectId) references.
 */
export function transformAppointment(doc: any): TransformedAppointment {
  if (!doc) return doc;

  const id = doc._id?.toString() ?? '';

  // ── Patient ───────────────────────────────────────────────────────────────
  const rawPatient = doc.patientId;
  let patient: TransformedAppointmentPatient;
  if (rawPatient && typeof rawPatient === 'object' && rawPatient.firstName !== undefined) {
    const patId = rawPatient._id?.toString() ?? '';
    patient = {
      _id: patId,
      name: `${rawPatient.firstName ?? ''} ${rawPatient.lastName ?? ''}`.trim(),
      publicId: patId ? `PAT-${patId.slice(-5).toUpperCase()}` : '',
      phone: rawPatient.phone ?? null,
      email: rawPatient.email ?? null,
      photo: rawPatient.profilePicture ?? null,
    };
  } else {
    // Not populated — return raw ID only
    const patId = rawPatient?.toString() ?? '';
    patient = {
      _id: patId,
      name: '',
      publicId: patId ? `PAT-${patId.slice(-5).toUpperCase()}` : '',
      phone: null,
      email: null,
      photo: null,
    };
  }

  // ── Doctor ────────────────────────────────────────────────────────────────
  const rawDoctor = doc.doctorId;
  let doctor: TransformedAppointmentDoctor;
  if (rawDoctor && typeof rawDoctor === 'object' && rawDoctor.firstName !== undefined) {
    doctor = {
      _id: rawDoctor._id?.toString() ?? '',
      name: `${rawDoctor.firstName ?? ''} ${rawDoctor.lastName ?? ''}`.trim(),
      specialty: rawDoctor.specialty ?? null,
      phone: rawDoctor.phone ?? null,
      email: rawDoctor.email ?? null,
    };
  } else {
    doctor = {
      _id: rawDoctor?.toString() ?? '',
      name: '',
      specialty: null,
      phone: null,
      email: null,
    };
  }

  // ── Service ───────────────────────────────────────────────────────────────
  const rawService = doc.serviceId;
  let service: TransformedAppointmentService;
  if (rawService && typeof rawService === 'object' && rawService.name !== undefined) {
    service = {
      _id: rawService._id?.toString() ?? '',
      name: rawService.name ?? '',
      // Use the appointment's actual booked duration (set by user or auto-filled).
      // Fall back to the service default only when no appointment duration was stored.
      duration: doc.durationMinutes ?? rawService.durationMinutes ?? 0,
      description: rawService.description ?? null,
      price: rawService.price ?? null,
      sessions: rawService.sessions ?? undefined,
    };
  } else {
    service = {
      _id: rawService?.toString() ?? '',
      name: '',
      duration: doc.durationMinutes ?? 0,
      description: null,
      price: null,
    };
  }

  // ── Clinic ────────────────────────────────────────────────────────────────
  const rawClinic = doc.clinicId;
  let clinic: TransformedAppointmentClinic;
  if (rawClinic && typeof rawClinic === 'object' && rawClinic.name !== undefined) {
    clinic = {
      _id: rawClinic._id?.toString() ?? '',
      name: rawClinic.name ?? '',
    };
  } else {
    clinic = {
      _id: rawClinic?.toString() ?? '',
      name: '',
    };
  }

  return {
    _id: id,
    publicId: id ? `APPT-${id.slice(-5).toUpperCase()}` : '',
    patient,
    doctor,
    service,
    clinic,
    datetime: buildDatetime(doc.appointmentDate, doc.appointmentTime),
    status: doc.status ?? 'scheduled',
    urgency: doc.urgency ?? null,
    notes: doc.notes ?? null,
    cancellationReason: doc.cancellationReason ?? null,
    completionNotes: doc.completionNotes ?? null,
    invoiceId: doc.invoiceId
      ? (typeof doc.invoiceId === 'object' && doc.invoiceId._id
          ? doc.invoiceId._id.toString()
          : doc.invoiceId.toString())
      : null,
    sessionId: doc.sessionId ?? null,
    medicalReportId: doc.medicalReportId ? doc.medicalReportId.toString() : null,
    isDocumented: doc.isDocumented ?? false,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  };
}

/**
 * Transform an array of appointment documents.
 * Returns empty array if input is null/undefined.
 */
export function transformAppointmentList(docs: any[]): TransformedAppointment[] {
  if (!docs || !Array.isArray(docs)) return [];
  return docs.map(transformAppointment);
}
