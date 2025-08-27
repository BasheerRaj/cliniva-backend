import { Controller, Get, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationService } from '../organization/organization.service';
import { ComplexService } from '../complex/complex.service';
import { ClinicService } from '../clinic/clinic.service';
import { RealTimeValidationResponseDto } from '../onboarding/dto';

@Controller('validation')
export class ValidationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly complexService: ComplexService,
    private readonly clinicService: ClinicService,
  ) {}

  @Get('organization-name')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validateOrganizationName(
    @Query('name') name: string,
    @Request() req
  ): Promise<RealTimeValidationResponseDto> {
    try {
      if (!name || name.trim().length === 0) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'Organization name is required'
        };
      }

      if (name.length < 2) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'Organization name must be at least 2 characters long'
        };
      }

      if (name.length > 100) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'Organization name cannot exceed 100 characters'
        };
      }

      // Check uniqueness (considering current user's organization)
      const userId = req.user?.id;
      const isAvailable = await this.organizationService.isNameAvailable(name, userId);
      
      return {
        isValid: true,
        isAvailable,
        message: isAvailable 
          ? 'Organization name is available' 
          : 'Organization name is already taken',
        suggestion: !isAvailable ? `${name}-${Date.now().toString().slice(-4)}` : undefined
      };
    } catch (error) {
      return {
        isValid: false,
        isAvailable: false,
        message: 'Unable to validate organization name at this time'
      };
    }
  }

  @Get('complex-name')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validateComplexName(
    @Query('name') name: string,
    @Query('organizationId') organizationId?: string,
    @Request() req?
  ): Promise<RealTimeValidationResponseDto> {
    try {
      if (!name || name.trim().length === 0) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'Complex name is required'
        };
      }

      if (name.length < 2) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'Complex name must be at least 2 characters long'
        };
      }

      if (name.length > 100) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'Complex name cannot exceed 100 characters'
        };
      }

      // Check uniqueness within organization scope
      const isAvailable = await this.complexService.isNameAvailable(name, organizationId);
      
      return {
        isValid: true,
        isAvailable,
        message: isAvailable 
          ? 'Complex name is available' 
          : 'Complex name is already taken within this organization',
        suggestion: !isAvailable ? `${name}-${Date.now().toString().slice(-4)}` : undefined
      };
    } catch (error) {
      return {
        isValid: false,
        isAvailable: false,
        message: 'Unable to validate complex name at this time'
      };
    }
  }

  @Get('clinic-name')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validateClinicName(
    @Query('name') name: string,
    @Query('complexId') complexId?: string,
    @Query('organizationId') organizationId?: string,
    @Request() req?
  ): Promise<RealTimeValidationResponseDto> {
    try {
      if (!name || name.trim().length === 0) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'Clinic name is required'
        };
      }

      const trimmedName = name.trim();

      // Enhanced length validation
      if (trimmedName.length < 2) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'Clinic name must be at least 2 characters long',
          suggestion: 'Try a longer, more descriptive name'
        };
      }

      if (trimmedName.length > 100) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'Clinic name cannot exceed 100 characters',
          suggestion: 'Please shorten the name while keeping it descriptive'
        };
      }

      // Enhanced character validation
      const validNamePattern = /^[a-zA-Z0-9\s\-&'.,()]+$/;
      if (!validNamePattern.test(trimmedName)) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'Clinic name contains invalid characters',
          suggestion: 'Use only letters, numbers, spaces, hyphens, ampersands, apostrophes, periods, commas, and parentheses'
        };
      }

      // Check for inappropriate content (basic check)
      const inappropriateWords = ['test', 'temp', 'demo', 'sample', 'example'];
      const lowerName = trimmedName.toLowerCase();
      const hasInappropriate = inappropriateWords.some(word => lowerName.includes(word));
      
      if (hasInappropriate) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'Clinic name appears to be temporary or inappropriate for a medical facility',
          suggestion: 'Please use a professional clinic name'
        };
      }

      // Check uniqueness within complex or organization scope
      const isAvailable = await this.clinicService.isNameAvailable(trimmedName, complexId, organizationId);
      
      if (!isAvailable) {
        // Generate multiple intelligent suggestions
        const suggestions = await this.generateClinicNameSuggestions(trimmedName, complexId, organizationId);
        
        return {
          isValid: true,
          isAvailable: false,
          message: complexId 
            ? 'Clinic name is already taken within this complex'
            : organizationId 
              ? 'Clinic name is already taken within this organization'
              : 'Clinic name is already taken',
          suggestion: suggestions.length > 0 ? suggestions[0] : `${trimmedName}-${Date.now().toString().slice(-4)}`,
          suggestions: suggestions.slice(0, 3) // Provide up to 3 suggestions
        };
      }
      
      return {
        isValid: true,
        isAvailable: true,
        message: 'Clinic name is available and valid'
      };
    } catch (error) {
      console.error('Error validating clinic name:', error);
      return {
        isValid: false,
        isAvailable: false,
        message: 'Unable to validate clinic name at this time. Please try again.'
      };
    }
  }

  // Helper method to generate intelligent clinic name suggestions
  private async generateClinicNameSuggestions(baseName: string, complexId?: string, organizationId?: string): Promise<string[]> {
    const suggestions: string[] = [];
    const cleanBaseName = baseName.trim();
    
    try {
      // Generate different types of suggestions
      const patterns = [
        `${cleanBaseName} Medical Center`,
        `${cleanBaseName} Healthcare`,
        `${cleanBaseName} Clinic`,
        `${cleanBaseName} Medical`,
        `${cleanBaseName} Health Center`,
        `${cleanBaseName} Care Center`,
        `${cleanBaseName} Specialty Clinic`,
        `${cleanBaseName} Family Clinic`,
        `New ${cleanBaseName}`,
        `${cleanBaseName} Plus`,
        `${cleanBaseName} Advanced`,
        `${cleanBaseName} Premier`
      ];
      
      // Check which suggestions are available
      for (const suggestion of patterns) {
        const isAvailable = await this.clinicService.isNameAvailable(suggestion, complexId, organizationId);
        if (isAvailable) {
          suggestions.push(suggestion);
          if (suggestions.length >= 5) break; // Limit to 5 suggestions
        }
      }
      
      // If no pattern suggestions work, add numeric suffixes
      if (suggestions.length < 3) {
        for (let i = 1; i <= 5; i++) {
          const numberedSuggestion = `${cleanBaseName} ${i}`;
          const isAvailable = await this.clinicService.isNameAvailable(numberedSuggestion, complexId, organizationId);
          if (isAvailable) {
            suggestions.push(numberedSuggestion);
            if (suggestions.length >= 5) break;
          }
        }
      }
      
    } catch (error) {
      console.error('Error generating clinic name suggestions:', error);
      // Fallback to simple suggestions
      suggestions.push(
        `${cleanBaseName}-${Date.now().toString().slice(-4)}`,
        `${cleanBaseName} Medical`,
        `${cleanBaseName} Healthcare`
      );
    }
    
    return suggestions;
  }

  @Get('vat-number')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validateVatNumber(
    @Query('vatNumber') vatNumber: string,
    @Request() req
  ): Promise<RealTimeValidationResponseDto> {
    try {
      if (!vatNumber || vatNumber.trim().length === 0) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'VAT number is required'
        };
      }

      // Basic VAT number format validation (adjust regex based on your country)
      const vatRegex = /^[0-9]{15}$/;
      if (!vatRegex.test(vatNumber)) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'VAT number must be 15 digits'
        };
      }

      // Check uniqueness across all entities
      const isAvailable = await this.organizationService.isVatNumberAvailable(vatNumber);
      
      return {
        isValid: true,
        isAvailable,
        message: isAvailable 
          ? 'VAT number is valid and available' 
          : 'VAT number is already registered'
      };
    } catch (error) {
      return {
        isValid: false,
        isAvailable: false,
        message: 'Unable to validate VAT number at this time'
      };
    }
  }

  @Get('cr-number')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validateCrNumber(
    @Query('crNumber') crNumber: string,
    @Request() req
  ): Promise<RealTimeValidationResponseDto> {
    try {
      if (!crNumber || crNumber.trim().length === 0) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'CR number is required'
        };
      }

      // Basic CR number format validation (adjust regex based on your country)
      const crRegex = /^[0-9]{10}$/;
      if (!crRegex.test(crNumber)) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'CR number must be 10 digits'
        };
      }

      // Check uniqueness across all entities
      const isAvailable = await this.organizationService.isCrNumberAvailable(crNumber);
      
      return {
        isValid: true,
        isAvailable,
        message: isAvailable 
          ? 'CR number is valid and available' 
          : 'CR number is already registered'
      };
    } catch (error) {
      return {
        isValid: false,
        isAvailable: false,
        message: 'Unable to validate CR number at this time'
      };
    }
  }

  @Get('email')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validateEmail(
    @Query('email') email: string,
    @Query('entityType') entityType?: 'organization' | 'complex' | 'clinic',
    @Request() req?
  ): Promise<RealTimeValidationResponseDto> {
    try {
      if (!email || email.trim().length === 0) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'Email address is required'
        };
      }

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'Please enter a valid email address'
        };
      }

      // Check uniqueness across all entities or specific entity type
      let isAvailable = false;
      if (entityType === 'organization') {
        isAvailable = await this.organizationService.isEmailAvailable(email);
      } else if (entityType === 'complex') {
        isAvailable = await this.complexService.isEmailAvailable(email);
      } else if (entityType === 'clinic') {
        isAvailable = await this.clinicService.isEmailAvailable(email);
      } else {
        // Check across all entity types
        isAvailable = await this.organizationService.isEmailAvailable(email) &&
                     await this.complexService.isEmailAvailable(email) &&
                     await this.clinicService.isEmailAvailable(email);
      }
      
      return {
        isValid: true,
        isAvailable,
        message: isAvailable 
          ? 'Email address is available' 
          : 'Email address is already registered'
      };
    } catch (error) {
      return {
        isValid: false,
        isAvailable: false,
        message: 'Unable to validate email address at this time'
      };
    }
  }

  @Get('phone')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validatePhone(
    @Query('phone') phone: string,
    @Request() req
  ): Promise<RealTimeValidationResponseDto> {
    try {
      if (!phone || phone.trim().length === 0) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'Phone number is required'
        };
      }

      // Basic phone format validation (adjust regex based on your requirements)
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(phone)) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'Please enter a valid phone number'
        };
      }

      // Phone numbers are usually not unique across entities, so just validate format
      return {
        isValid: true,
        isAvailable: true,
        message: 'Phone number is valid'
      };
    } catch (error) {
      return {
        isValid: false,
        isAvailable: false,
        message: 'Unable to validate phone number at this time'
      };
    }
  }

  @Get('license-number')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validateLicenseNumber(
    @Query('licenseNumber') licenseNumber: string,
    @Request() req
  ): Promise<RealTimeValidationResponseDto> {
    try {
      if (!licenseNumber || licenseNumber.trim().length === 0) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'Medical license number is required'
        };
      }

      if (licenseNumber.length < 5) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'License number must be at least 5 characters'
        };
      }

      if (licenseNumber.length > 20) {
        return {
          isValid: false,
          isAvailable: false,
          message: 'License number cannot exceed 20 characters'
        };
      }

      // Check uniqueness for medical licenses
      const isAvailable = await this.clinicService.isLicenseNumberAvailable(licenseNumber);
      
      return {
        isValid: true,
        isAvailable,
        message: isAvailable 
          ? 'License number is available' 
          : 'License number is already registered'
      };
    } catch (error) {
      return {
        isValid: false,
        isAvailable: false,
        message: 'Unable to validate license number at this time'
      };
    }
  }
} 