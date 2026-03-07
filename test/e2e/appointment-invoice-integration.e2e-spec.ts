import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { Connection, Types } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppModule } from '../../src/app.module';

/**
 * E2E Test: Appointment-Invoice Integration
 * 
 * This test verifies the integration between the Appointment and Invoice modules,
 * specifically testing that confirming an appointment transitions a linked draft
 * invoice to Posted status.
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7
 * Task: 13. Checkpoint - Verify appointment integration
 */
describe('Appointment-Invoice Integration (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let authToken: string;
  let userId: string;
  let clinicId: string;
  let patientId: string;
  let doctorId: string;
  let serviceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    connection = moduleFixture.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await connection.collection('users').deleteMany({});
    await connection.collection('clinics').deleteMany({});
    await connection.collection('patients').deleteMany({});
    await connection.collection('services').deleteMany({});
    await connection.collection('appointments').deleteMany({});
    await connection.collection('invoices').deleteMany({});
  });

  describe('Invoice Status Transition on Appointment Confirmation', () => {
    beforeEach(async () => {
      // Setup: Create test user, clinic, patient, doctor, and service
      const userResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
          firstName: 'Test',
          lastName: 'User',
          role: 'admin',
        });

      authToken = userResponse.body.data.accessToken;
      userId = userResponse.body.data.user._id;

      // Create clinic
      const clinicResponse = await request(app.getHttpServer())
        .post('/clinics')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Clinic',
          address: '123 Test St',
          phone: '1234567890',
        });

      clinicId = clinicResponse.body.data._id;

      // Create patient
      const patientResponse = await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          gender: 'male',
          phone: '9876543210',
          clinicId,
        });

      patientId = patientResponse.body.data._id;

      // Create doctor (user with doctor role)
      const doctorResponse = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'doctor@example.com',
          password: 'Doctor123!@#',
          firstName: 'Dr. Jane',
          lastName: 'Smith',
          role: 'doctor',
          clinicId,
        });

      doctorId = doctorResponse.body.data._id;

      // Create service
      const serviceResponse = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Consultation',
          price: 200,
          durationMinutes: 30,
          isActive: true,
          clinicId,
        });

      serviceId = serviceResponse.body.data._id;
    });

    it('should transition draft invoice to Posted when appointment is confirmed', async () => {
      // Step 1: Create a draft invoice
      const invoiceResponse = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoiceTitle: 'Initial Consultation',
          issueDate: new Date().toISOString().split('T')[0],
          patientId,
          clinicId,
          serviceId,
          sessions: 1,
          discountAmount: 0,
          taxAmount: 0,
        })
        .expect(201);

      const invoice = invoiceResponse.body.data;
      
      // Verify invoice is in Draft status
      expect(invoice.invoiceStatus).toBe('draft');
      expect(invoice.paymentStatus).toBe('not_due');
      expect(invoice.invoiceNumber).toMatch(/^DFT-\d{4}$/);
      
      const draftNumber = invoice.invoiceNumber;
      const invoiceId = invoice._id;

      // Step 2: Create an appointment linked to the invoice
      const appointmentResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId,
          doctorId,
          serviceId,
          clinicId,
          appointmentDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
          appointmentTime: '10:00',
          durationMinutes: 30,
          invoiceId, // Link to invoice
        })
        .expect(201);

      const appointment = appointmentResponse.body.data;
      expect(appointment.status).toBe('scheduled');
      expect(appointment.invoiceId).toBe(invoiceId);

      // Step 3: Confirm the appointment
      const confirmResponse = await request(app.getHttpServer())
        .patch(`/appointments/${appointment._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          confirmationNotes: 'Appointment confirmed by patient',
        })
        .expect(200);

      expect(confirmResponse.body.data.status).toBe('confirmed');

      // Step 4: Verify invoice transitioned to Posted
      const updatedInvoiceResponse = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const updatedInvoice = updatedInvoiceResponse.body.data;

      // Requirement 15.2: Invoice status should be Posted
      expect(updatedInvoice.invoiceStatus).toBe('posted');

      // Requirement 15.3: New INV-xxxx number generated
      expect(updatedInvoice.invoiceNumber).toMatch(/^INV-\d{4}$/);
      expect(updatedInvoice.invoiceNumber).not.toBe(draftNumber);

      // Requirement 15.3: Original DFT-xxxx preserved
      expect(updatedInvoice.draftNumber).toBe(draftNumber);

      // Requirement 15.4: Payment status changed to Unpaid
      expect(updatedInvoice.paymentStatus).toBe('unpaid');

      // Requirement 15.5: Posted timestamp recorded
      expect(updatedInvoice.postedAt).toBeDefined();
      expect(new Date(updatedInvoice.postedAt)).toBeInstanceOf(Date);

      // Requirement 5.7: Outstanding balance preserved
      expect(updatedInvoice.outstandingBalance).toBe(updatedInvoice.totalAmount);
    });

    it('should not fail appointment confirmation if invoice transition fails', async () => {
      // Step 1: Create appointment with invalid invoiceId
      const appointmentResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId,
          doctorId,
          serviceId,
          clinicId,
          appointmentDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          appointmentTime: '10:00',
          durationMinutes: 30,
          invoiceId: new Types.ObjectId().toString(), // Non-existent invoice
        })
        .expect(201);

      const appointment = appointmentResponse.body.data;

      // Step 2: Confirm appointment - should succeed despite invalid invoice
      // Requirement 15.7: Handle errors gracefully
      const confirmResponse = await request(app.getHttpServer())
        .patch(`/appointments/${appointment._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          confirmationNotes: 'Confirming despite invoice issue',
        })
        .expect(200);

      // Appointment should be confirmed
      expect(confirmResponse.body.data.status).toBe('confirmed');
    });

    it('should handle multiple appointments linked to same invoice', async () => {
      // Step 1: Create a draft invoice
      const invoiceResponse = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoiceTitle: 'Multi-Session Treatment',
          issueDate: new Date().toISOString().split('T')[0],
          patientId,
          clinicId,
          serviceId,
          sessions: 3,
          discountAmount: 0,
          taxAmount: 0,
        })
        .expect(201);

      const invoiceId = invoiceResponse.body.data._id;

      // Step 2: Create multiple appointments linked to same invoice
      const appointment1Response = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId,
          doctorId,
          serviceId,
          clinicId,
          appointmentDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          appointmentTime: '10:00',
          durationMinutes: 30,
          invoiceId,
        })
        .expect(201);

      const appointment2Response = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId,
          doctorId,
          serviceId,
          clinicId,
          appointmentDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
          appointmentTime: '11:00',
          durationMinutes: 30,
          invoiceId,
        })
        .expect(201);

      // Step 3: Confirm first appointment
      await request(app.getHttpServer())
        .patch(`/appointments/${appointment1Response.body.data._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ confirmationNotes: 'First session confirmed' })
        .expect(200);

      // Step 4: Verify invoice transitioned to Posted
      const invoiceAfterFirst = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(invoiceAfterFirst.body.data.invoiceStatus).toBe('posted');

      // Step 5: Confirm second appointment - invoice should remain Posted
      await request(app.getHttpServer())
        .patch(`/appointments/${appointment2Response.body.data._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ confirmationNotes: 'Second session confirmed' })
        .expect(200);

      // Step 6: Verify invoice still Posted (not transitioned again)
      const invoiceAfterSecond = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(invoiceAfterSecond.body.data.invoiceStatus).toBe('posted');
      expect(invoiceAfterSecond.body.data.invoiceNumber).toBe(
        invoiceAfterFirst.body.data.invoiceNumber,
      );
    });

    it('should not transition already Posted invoice', async () => {
      // Step 1: Create and manually post an invoice
      const invoiceResponse = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoiceTitle: 'Already Posted Invoice',
          issueDate: new Date().toISOString().split('T')[0],
          patientId,
          clinicId,
          serviceId,
          sessions: 1,
          discountAmount: 0,
          taxAmount: 0,
        })
        .expect(201);

      const invoiceId = invoiceResponse.body.data._id;

      // Manually transition to Posted
      await request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/post`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const postedInvoice = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const originalInvoiceNumber = postedInvoice.body.data.invoiceNumber;

      // Step 2: Create appointment linked to Posted invoice
      const appointmentResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId,
          doctorId,
          serviceId,
          clinicId,
          appointmentDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          appointmentTime: '10:00',
          durationMinutes: 30,
          invoiceId,
        })
        .expect(201);

      // Step 3: Confirm appointment
      await request(app.getHttpServer())
        .patch(`/appointments/${appointmentResponse.body.data._id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ confirmationNotes: 'Confirming with Posted invoice' })
        .expect(200);

      // Step 4: Verify invoice remains unchanged
      const finalInvoice = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalInvoice.body.data.invoiceStatus).toBe('posted');
      expect(finalInvoice.body.data.invoiceNumber).toBe(originalInvoiceNumber);
    });
  });

  describe('Invoice Number Changes', () => {
    it('should change invoice number from DFT-xxxx to INV-xxxx format', async () => {
      // Setup test data
      const setupResponse = await setupTestData(app, authToken);
      const { invoiceId, appointmentId } = setupResponse;

      // Get initial invoice
      const initialInvoice = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const draftNumber = initialInvoice.body.data.invoiceNumber;
      expect(draftNumber).toMatch(/^DFT-\d{4}$/);

      // Confirm appointment
      await request(app.getHttpServer())
        .patch(`/appointments/${appointmentId}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ confirmationNotes: 'Confirmed' })
        .expect(200);

      // Get updated invoice
      const updatedInvoice = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const postedNumber = updatedInvoice.body.data.invoiceNumber;
      
      // Verify number format changed
      expect(postedNumber).toMatch(/^INV-\d{4}$/);
      expect(postedNumber).not.toBe(draftNumber);
      
      // Verify draft number preserved
      expect(updatedInvoice.body.data.draftNumber).toBe(draftNumber);
    });
  });

  describe('Payment Status Updates', () => {
    it('should update payment status from not_due to unpaid', async () => {
      // Setup test data
      const setupResponse = await setupTestData(app, authToken);
      const { invoiceId, appointmentId } = setupResponse;

      // Verify initial payment status
      const initialInvoice = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(initialInvoice.body.data.paymentStatus).toBe('not_due');

      // Confirm appointment
      await request(app.getHttpServer())
        .patch(`/appointments/${appointmentId}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ confirmationNotes: 'Confirmed' })
        .expect(200);

      // Verify payment status updated
      const updatedInvoice = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(updatedInvoice.body.data.paymentStatus).toBe('unpaid');
    });
  });
});

/**
 * Helper function to setup test data
 */
async function setupTestData(app: INestApplication, authToken: string) {
  // This is a placeholder - implement based on your actual test setup needs
  // Returns invoiceId and appointmentId for testing
  return {
    invoiceId: 'test-invoice-id',
    appointmentId: 'test-appointment-id',
  };
}
