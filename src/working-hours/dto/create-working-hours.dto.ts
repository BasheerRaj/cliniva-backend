import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Custom validator to check if time format is valid (HH:MM)
 */
function IsValidTimeFormat(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidTimeFormat',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // Optional fields
          const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
          return typeof value === 'string' && timeRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return '{"ar":"صيغة الوقت غير صحيحة. يجب أن تكون بصيغة HH:MM","en":"Invalid time format. Must be HH:MM"}';
        },
      },
    });
  };
}

/**
 * Custom validator to check working hours logic
 */
function ValidateWorkingHours(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'validateWorkingHours',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: (() => {
        let errorMessage = '{"ar":"ساعات العمل غير صالحة","en":"Invalid working hours"}';
        return {
          validate(value: any, args: ValidationArguments) {
            const obj = args.object as any;

            // Skip validation if not a working day
            if (!obj.isWorkingDay) return true;

            const { openingTime, closingTime, breakStartTime, breakEndTime } =
              obj;

            // If working day, opening and closing times are required
            if (!openingTime || !closingTime) {
              errorMessage =
                '{"ar":"وقت الفتح والإغلاق مطلوبان لأيام العمل","en":"Opening and closing times are required for working days"}';
              return false;
            }

            // Convert time strings to minutes for comparison
            const timeToMinutes = (time: string): number => {
              const [hours, minutes] = time.split(':').map(Number);
              return hours * 60 + minutes;
            };

            const openingMinutes = timeToMinutes(openingTime);
            // Midnight (00:00) as closing time means end-of-day (24:00 = 1440 min)
            const closingMinutes =
              closingTime === '00:00' ? 1440 : timeToMinutes(closingTime);

            // Closing time must be after opening time
            if (closingMinutes <= openingMinutes) {
              errorMessage =
                '{"ar":"وقت الإغلاق يجب أن يكون بعد وقت الفتح","en":"Closing time must be after opening time"}';
              return false;
            }

            // If break times are provided, validate them
            if (breakStartTime && breakEndTime) {
              const breakStartMinutes = timeToMinutes(breakStartTime);
              const breakEndMinutes = timeToMinutes(breakEndTime);

              // Break end must be after break start
              if (breakEndMinutes <= breakStartMinutes) {
                errorMessage =
                  '{"ar":"وقت نهاية الاستراحة يجب أن يكون بعد وقت البداية","en":"Break end time must be after break start time"}';
                return false;
              }

              // Break must be within working hours (inclusive on both boundaries)
              const breakWithinHours =
                breakStartMinutes >= openingMinutes &&
                breakEndMinutes <= closingMinutes;
              if (!breakWithinHours) {
                errorMessage =
                  '{"ar":"وقت الاستراحة يجب أن يكون ضمن ساعات العمل","en":"Break time must be within working hours"}';
                return false;
              }
            }

            return true;
          },
          defaultMessage(_args: ValidationArguments) {
            return errorMessage;
          },
        };
      })(),
    });
  };
}

export class WorkingHourDto {
  @IsString()
  @IsEnum(
    [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ],
    {
      message:
        '{"ar":"يجب أن يكون اليوم أحد أيام الأسبوع الصحيحة (monday, tuesday, wednesday, thursday, friday, saturday, sunday)","en":"Day of week must be one of: monday, tuesday, wednesday, thursday, friday, saturday, sunday"}',
    },
  )
  dayOfWeek: string;

  @IsBoolean()
  isWorkingDay: boolean;

  @IsString()
  @IsOptional()
  @IsValidTimeFormat()
  openingTime?: string;

  @IsString()
  @IsOptional()
  @IsValidTimeFormat()
  closingTime?: string;

  @IsString()
  @IsOptional()
  @IsValidTimeFormat()
  breakStartTime?: string;

  @IsString()
  @IsOptional()
  @IsValidTimeFormat()
  breakEndTime?: string;

  @ValidateWorkingHours()
  _validateWorkingHours?: any; // Dummy property for class-level validation
}

export class CreateWorkingHoursDto {
  @IsString({
    message:
      '{"ar":"نوع الكيان يجب أن يكون نصاً","en":"Entity type must be a string"}',
  })
  @IsEnum(['organization', 'complex', 'clinic', 'user'], {
    message:
      '{"ar":"نوع الكيان يجب أن يكون أحد القيم التالية: organization, complex, clinic, user","en":"Entity type must be one of: organization, complex, clinic, user"}',
  })
  entityType: string;

  @IsString({
    message:
      '{"ar":"معرف الكيان يجب أن يكون نصاً","en":"Entity ID must be a string"}',
  })
  @IsNotEmpty({
    message: '{"ar":"معرف الكيان مطلوب","en":"Entity ID is required"}',
  })
  entityId: string;

  @IsArray({
    message:
      '{"ar":"الجدول الزمني يجب أن يكون مصفوفة","en":"Schedule must be an array"}',
  })
  @ValidateNested({ each: true })
  @Type(() => WorkingHourDto)
  schedule: WorkingHourDto[];
}

export class UpdateWorkingHoursDto {
  @IsArray({
    message:
      '{"ar":"الجدول الزمني يجب أن يكون مصفوفة","en":"Schedule must be an array"}',
  })
  @ValidateNested({ each: true })
  @Type(() => WorkingHourDto)
  schedule: WorkingHourDto[];
}
