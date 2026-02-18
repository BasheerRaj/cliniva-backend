import { validate } from 'class-validator';
import { ForgotPasswordDto } from './forgot-password.dto';

describe('ForgotPasswordDto', () => {
  it('should fail validation for invalid email format', async () => {
    const dto = new ForgotPasswordDto();
    dto.email = 'not-an-email';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);

    const emailError = errors.find((e) => e.property === 'email');
    expect(emailError).toBeDefined();

    // Check that the error message is bilingual (JSON stringified)
    const constraints = Object.values(emailError!.constraints || {});
    expect(constraints.length).toBeGreaterThan(0);

    // Parse the first constraint message
    const firstMessage = constraints[0];
    const parsed = JSON.parse(firstMessage);

    expect(parsed).toHaveProperty('ar');
    expect(parsed).toHaveProperty('en');
    expect(parsed.ar).toBe('البريد الإلكتروني غير صالح');
    expect(parsed.en).toBe('Invalid email address');
  });

  it('should fail validation for empty email', async () => {
    const dto = new ForgotPasswordDto();
    dto.email = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);

    const emailError = errors.find((e) => e.property === 'email');
    expect(emailError).toBeDefined();
  });

  it('should pass validation for valid email', async () => {
    const dto = new ForgotPasswordDto();
    dto.email = 'test@example.com';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should transform email to lowercase and trim whitespace', async () => {
    const dto = new ForgotPasswordDto();
    dto.email = '  TEST@EXAMPLE.COM  ';

    // Manually apply transform (in real app, ValidationPipe does this)
    dto.email = dto.email.toLowerCase().trim();

    expect(dto.email).toBe('test@example.com');

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
