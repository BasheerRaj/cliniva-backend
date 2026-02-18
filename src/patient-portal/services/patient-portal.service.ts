import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../database/schemas/user.schema';
import { Patient } from '../../database/schemas/patient.schema';
import { Appointment } from '../../database/schemas/appointment.schema';
import { RegisterPatientUserDto, LoginPatientDto } from '../dto/auth.dto';
import { BookAppointmentDto } from '../dto/appointment.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { NotificationService } from '../../notification/notification.service';
import { AppointmentService } from '../../appointment/appointment.service';

@Injectable()
export class PatientPortalService {
  private readonly logger = new Logger(PatientPortalService.name);

  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Patient') private readonly patientModel: Model<Patient>,
    @InjectModel('Appointment')
    private readonly appointmentModel: Model<Appointment>,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
    private readonly appointmentService: AppointmentService,
  ) {}

  /**
   * Register a new patient user
   */
  async register(registerDto: RegisterPatientUserDto) {
    // 1. Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: registerDto.email,
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(registerDto.password, salt);

    // 3. Create User
    const user = new this.userModel({
      email: registerDto.email,
      passwordHash,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      phone: registerDto.phone,
      role: UserRole.PATIENT,
      gender: registerDto.gender,
      dateOfBirth: registerDto.dateOfBirth
        ? new Date(registerDto.dateOfBirth)
        : undefined,
      isActive: true,
      emailVerified: false, // In a real app, send verification email
    });
    const savedUser = await user.save();

    // 4. Check if Patient profile exists (by phone or email) to link, or create new
    const patient = await this.patientModel.findOne({
      $or: [{ email: registerDto.email }, { phone: registerDto.phone }],
    });

    if (patient) {
      // Link existing patient
      (patient as any).userId = savedUser._id as Types.ObjectId;
      (patient as any).isPortalEnabled = true;
      await (patient as any).save();
    } else {
      // Create new patient profile
      const patientNumber = await this.generatePatientNumber();
      const cardNumber = `CARD-${Date.now()}`; // Simple generation for now

      const newPatient = new this.patientModel({
        userId: (savedUser as any)._id,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        email: registerDto.email,
        phone: registerDto.phone,
        gender: registerDto.gender,
        dateOfBirth: registerDto.dateOfBirth
          ? new Date(registerDto.dateOfBirth)
          : new Date(),
        patientNumber,
        cardNumber,
        status: 'Active',
        isPortalEnabled: true,
      });
      await newPatient.save();
    }

    // 5. Generate Token
    const payload = {
      sub: (savedUser as any)._id,
      email: savedUser.email,
      role: savedUser.role,
    };
    const accessToken = this.jwtService.sign(payload);

    // 6. Send Welcome Notification
    await this.notificationService.create({
      recipientId: (savedUser as any)._id.toString(),
      title: 'Welcome to Patient Portal',
      message: `Welcome ${registerDto.firstName}! You can now book appointments and view your medical records online.`,
      notificationType: 'general',
      priority: 'normal',
      deliveryMethod: 'email',
    });

    return {
      user: {
        id: (savedUser as any)._id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
      },
      accessToken,
    };
  }

  /**
   * Login patient
   */
  async login(loginDto: LoginPatientDto) {
    const user = await this.userModel.findOne({ email: loginDto.email });
    if (!user || user.role !== UserRole.PATIENT) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const payload = {
      sub: (user as any)._id,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: (user as any)._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  /**
   * Get Patient Dashboard Stats
   */
  async getDashboard(userId: string) {
    // Find linked patient profile
    const patient = await this.patientModel.findOne({
      userId: new Types.ObjectId(userId),
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    const today = new Date();

    // Get upcoming appointments
    const upcomingAppointments = await this.appointmentModel
      .find({
        patientId: (patient as any)._id,
        appointmentDate: { $gte: today },
        status: { $in: ['scheduled', 'confirmed'] },
      })
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .limit(5)
      .populate('doctorId', 'firstName lastName')
      .populate('clinicId', 'name address');

    // Get recent medical history/reports (placeholder logic until MedicalReport module is fully linked)
    // const recentReports = ...

    return {
      patientProfile: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        patientNumber: patient.patientNumber,
        photo: (patient as any).profilePicture,
      },
      upcomingAppointments,
      stats: {
        totalAppointments: await this.appointmentModel.countDocuments({
          patientId: (patient as any)._id,
        }),
        upcomingCount: upcomingAppointments.length,
      },
    };
  }

  /**
   * Book appointment for patient
   */
  async bookAppointment(userId: string, bookDto: BookAppointmentDto) {
    // Get patient profile
    const patient = await this.patientModel.findOne({
      userId: new Types.ObjectId(userId),
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    if (patient.status !== 'Active') {
      throw new BadRequestException('Patient account is inactive');
    }

    // Delegate to AppointmentService
    // We construct the DTO expected by AppointmentService
    const createDto: any = {
      patientId: (patient as any)._id.toString(),
      doctorId: bookDto.doctorId,
      clinicId: bookDto.clinicId,
      serviceId: bookDto.serviceId,
      appointmentDate: bookDto.appointmentDate,
      appointmentTime: bookDto.appointmentTime,
      notes: bookDto.notes,
      status: 'scheduled',
      urgencyLevel: 'medium',
    };

    return this.appointmentService.createAppointment(createDto, userId);
  }

  /**
   * Get all appointments for patient
   */
  async getAppointments(userId: string) {
    const patient = await this.patientModel.findOne({
      userId: new Types.ObjectId(userId),
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    return this.appointmentService.getPatientAppointments(
      (patient as any)._id.toString(),
    );
  }

  private async generatePatientNumber(): Promise<string> {
    const prefix = 'PAT';
    const year = new Date().getFullYear();
    const lastPatient = await this.patientModel.findOne(
      { patientNumber: { $regex: `^${prefix}${year}` } },
      {},
      { sort: { patientNumber: -1 } },
    );

    let nextNumber = 1;
    if (lastPatient && lastPatient.patientNumber) {
      const lastNumber = parseInt(lastPatient.patientNumber.substring(7));
      nextNumber = lastNumber + 1;
    }
    return `${prefix}${year}${nextNumber.toString().padStart(3, '0')}`;
  }
}
