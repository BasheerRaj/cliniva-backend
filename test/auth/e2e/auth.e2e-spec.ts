import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import request from 'supertest';

import { AppModule } from '../../../src/app.module';
import { AuthModule } from '../../../src/auth/auth.module';
import { 
  validRegisterData, 
  validLoginData, 
  invalidRegisterData, 
  invalidLoginData,
  userRoleFixtures,
  testEnvironment 
} from '../fixtures/auth.fixtures';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Set test environment variables
    Object.assign(process.env, testEnvironment);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply validation pipe
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('refresh_token');
          expect(res.body).toHaveProperty('expires_in');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(validRegisterData.email);
          expect(res.body.user.role).toBe(validRegisterData.role);
        });
    });

    it('should reject registration with invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidRegisterData.invalidEmail)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Please provide a valid email address');
        });
    });

    it('should reject registration with weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidRegisterData.weakPassword)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Password must contain');
        });
    });

    it('should reject registration with invalid role', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidRegisterData.invalidRole)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Role must be one of');
        });
    });

    it('should reject duplicate email registration', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterData)
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toBe('User with this email already exists');
        });
    });

    it('should register users with different roles', async () => {
      for (const [roleName, userData] of Object.entries(userRoleFixtures)) {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send(userData)
          .expect(201)
          .expect((res) => {
            expect(res.body.user.role).toBe(userData.role);
          });
      }
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('refresh_token');
          expect(res.body.user.email).toBe(validLoginData.email);
          
          // Store tokens for subsequent tests
          accessToken = res.body.access_token;
          refreshToken = res.body.refresh_token;
        });
    });

    it('should reject login with invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidLoginData.invalidEmail)
        .expect(400);
    });

    it('should reject login with wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: validLoginData.email,
          password: 'WrongPassword123!',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid credentials');
        });
    });

    it('should reject login with non-existent email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@clinic.com',
          password: validLoginData.password,
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid credentials');
        });
    });

    it('should reject login with empty credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidLoginData.emptyEmail)
        .expect(400);
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('should refresh token with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('refresh_token');
          expect(res.body.access_token).not.toBe(accessToken); // Should be new token
        });
    });

    it('should reject refresh with invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: 'invalid-refresh-token' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid token');
        });
    });

    it('should reject refresh with missing token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('/auth/profile (GET)', () => {
    it('should get user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
          expect(res.body).toHaveProperty('firstName');
          expect(res.body).toHaveProperty('lastName');
          expect(res.body).toHaveProperty('role');
          expect(res.body.email).toBe(validLoginData.email);
        });
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('should reject request with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject request with malformed authorization header', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });
  });

  describe('/auth/logout (POST)', () => {
    it('should logout successfully with valid token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toHaveProperty('ar');
          expect(res.body.message).toHaveProperty('en');
          expect(res.body.message.en).toBe('Logout successful');
        });
    });

    it('should reject logout without token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full authentication flow', async () => {
      const testUser = {
        email: 'flowtest@clinic.com',
        password: 'FlowTest123!',
        firstName: 'Flow',
        lastName: 'Test',
        role: 'staff',
      };

      // 1. Register
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      const { access_token, refresh_token } = registerResponse.body;

      // 2. Get Profile
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe(testUser.email);
        });

      // 3. Refresh Token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token })
        .expect(200);

      const newAccessToken = refreshResponse.body.access_token;

      // 4. Use New Token
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      // 5. Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);
    });
  });
});
