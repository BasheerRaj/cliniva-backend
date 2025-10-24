import { Controller, Post, Get, Body, Param, Put, UseGuards, Req, HttpStatus, HttpCode, Query, Request, } from '@nestjs/common';
import { ComplexService } from './complex.service';
import { CreateComplexDto, UpdateComplexDto } from './dto/create-complex.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Roles } from 'src/common/decorators/roles.decorator';
import { PaginatedComplexesResponseDto } from './dto/complex-response.dto';
import { PaginateComplexesDto } from './dto/paginate-complexes.dto';
@Controller('complexes')
export class ComplexController {
  constructor(private readonly complexService: ComplexService) { }

  @Post()
  async createComplex(@Body() createComplexDto: CreateComplexDto) {
    try {
      const complex = await this.complexService.createComplex(createComplexDto);
      return {
        success: true,
        message: 'Complex created successfully',
        data: complex
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create complex',
        error: error.message
      };
    }
  }
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getComplexesList(
    @Query() query: any,
    @Request() req
  ): Promise<PaginatedComplexesResponseDto> {
    try {
      const userId = req.user.userId || req.user.id;

      // طباعة للـ debugging
      console.log('🔍 Raw Query:', query);
      console.log('🔍 Query page type:', typeof query.page, 'value:', query.page);
      console.log('🔍 Query limit type:', typeof query.limit, 'value:', query.limit);

      // تحويل آمن للأرقام
      let page = 1;
      let limit = 10;

      if (query.page) {
        const parsedPage = parseInt(String(query.page), 10);
        if (!isNaN(parsedPage) && parsedPage > 0) {
          page = parsedPage;
        }
      }

      if (query.limit) {
        const parsedLimit = parseInt(String(query.limit), 10);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          limit = parsedLimit;
        }
      }

      console.log('✅ Converted page:', page, 'limit:', limit);

      // بناء الـ DTO
      const paginateDto = {
        page: page,
        limit: limit,
        search: query.search || undefined,
        organizationId: query.organizationId || undefined,
        status: query.status || undefined,
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder || 'desc'
      };

      console.log('📊 Final Pagination DTO:', paginateDto);

      const result = await this.complexService.getPaginatedComplexes(userId, paginateDto);

      return {
        success: true,
        message: 'Complexes list retrieved successfully',
        data: result
      };
    } catch (error) {
      console.error('❌ Error in getComplexesList:', error);
      return {
        success: false,
        message: error.message || 'Failed to retrieve complexes list',
        data: {
          complexes: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: 10,
            hasNextPage: false,
            hasPreviousPage: false
          }
        }
      };
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DOCTOR, UserRole.STAFF)
  async getComplex(@Param('id') id: string, @Req() req) {
    try {
      const userId = req.user.userId || req.user.id;

      // تحقق من الصلاحيات
      const accessCheck = await this.complexService.canAccessComplex(userId, id);

      if (!accessCheck.hasAccess) {
        return {
          success: false,
          message: accessCheck.reason || 'Access denied',
          error: 'Forbidden'
        };
      }

      const complex = await this.complexService.getComplex(id);
      return {
        success: true,
        message: 'Complex retrieved successfully',
        data: complex
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve complex',
        error: error.message
      };
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async updateComplex(
    @Param('id') id: string,
    @Body() updateComplexDto: UpdateComplexDto,
    @Req() req
  ) {
    try {
      const userId = req.user.userId || req.user.id;

      // تحقق من صلاحية التعديل
      const modifyCheck = await this.complexService.canModifyComplex(userId, id);

      if (!modifyCheck.canModify) {
        return {
          success: false,
          message: modifyCheck.reason || 'Access denied',
          error: 'Forbidden'
        };
      }

      const complex = await this.complexService.updateComplex(id, updateComplexDto);
      return {
        success: true,
        message: 'Complex updated successfully',
        data: complex
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update complex',
        error: error.message
      };
    }
  }


  @Get('subscription/:subscriptionId')
  async getComplexBySubscription(@Param('subscriptionId') subscriptionId: string) {
    try {
      const complex = await this.complexService.getComplexBySubscription(subscriptionId);
      return {
        success: true,
        message: complex ? 'Complex found' : 'No complex found for this subscription',
        data: complex
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve complex by subscription',
        error: error.message
      };
    }
  }

  @Get('organization/:organizationId')
  async getComplexesByOrganization(@Param('organizationId') organizationId: string) {
    try {
      const complexes = await this.complexService.getComplexesByOrganization(organizationId);
      return {
        success: true,
        message: 'Complexes retrieved successfully',
        data: complexes
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve complexes by organization',
        error: error.message
      };
    }
  }
} 