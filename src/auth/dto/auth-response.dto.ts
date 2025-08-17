import { User } from '../../database/schemas/user.schema';

export class AuthResponseDto {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
  };
}

export class UserProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  nationality?: string;
  dateOfBirth?: Date;
  gender?: string;
  isActive: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(user: User) {
    this.id = (user._id as any).toString();
    this.email = user.email;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.phone = user.phone;
    this.role = user.role;
    this.nationality = user.nationality;
    this.dateOfBirth = user.dateOfBirth;
    this.gender = user.gender;
    this.isActive = user.isActive;
    this.emailVerified = user.emailVerified;
    this.twoFactorEnabled = user.twoFactorEnabled;
    this.lastLogin = user.lastLogin;
    this.createdAt = (user as any).createdAt;
    this.updatedAt = (user as any).updatedAt;
  }
}
