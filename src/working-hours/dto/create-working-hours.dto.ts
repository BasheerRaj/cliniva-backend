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
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;

          // Skip validation if not a working day
          if (!obj.isWorkingDay) return true;

          const { openingTime, closingTime, breakStartTime, breakEndTime } =
            obj;

          // If working day, opening and closing times are required
          if (!openingTime || !closingTime) {
            return false;
          }

          // Convert time strings to minutes for comparison
          const timeToMinutes = (time: string): number => {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
          };

          const openingMinutes = timeToMinutes(openingTime);
          const closingMinutes = timeToMinutes(closingTime);

          // Closing time must be after opening time
          if (closingMinutes <= openingMinutes) {
            return false;
          }

          // If break times are provided, validate them
          if (breakStartTime && breakEndTime) {
            const breakStartMinutes = timeToMinutes(breakStartTime);
            const breakEndMinutes = timeToMinutes(breakEndTime);

            // Break end must be after break start
            if (breakEndMinutes <= breakStartMinutes) {
              return false;
            }

            // Break must be within working hours
            if (
              breakStartMinutes < openingMinutes ||
              breakEndMinutes > closingMinutes
            ) {
              return false;
            }
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as any;
          const { openingTime, closingTime, breakStartTime, breakEndTime } =
            obj;

          // If working day but missing times
          if (obj.isWorkingDay && (!openingTime || !closingTime)) {
            return '{"ar":"وقت الفتح والإغلاق مطلوبان لأيام العمل","en":"Opening and closing times are required for working days"}';
          }

          const timeToMinutes = (time: string): number => {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
          };

          const openingMinutes = timeToMinutes(openingTime);
          const closingMinutes = timeToMinutes(closingTime);

          // Check closing time
          if (closingMinutes <= openingMinutes) {
            return '{"ar":"وقت الإغلاق يجب أن يكون بعد وقت الفتح","en":"Closing time must be after opening time"}';
          }

          // Check break times
          if (breakStartTime && breakEndTime) {
            const breakStartMinutes = timeToMinutes(breakStartTime);
            const breakEndMinutes = timeToMinutes(breakEndTime);

            if (breakEndMinutes <= breakStartMinutes) {
              return '{"ar":"وقت نهاية الاستراحة يجب أن يكون بعد وقت البداية","en":"Break end time must be after break start time"}';
            }

            if (
              breakStartMinutes < openingMinutes ||
              breakEndMinutes > closingMinutes
            ) {
              return '{"ar":"وقت الاستراحة يجب أن يكون ضمن ساعات العمل","en":"Break time must be within working hours"}';
            }
          }

          return '{"ar":"ساعات العمل غير صالحة","en":"Invalid working hours"}';
        },
      },
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
