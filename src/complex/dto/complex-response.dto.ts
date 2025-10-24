export class ComplexListItemDto {
  no: number;
  complexId: string;
  complexName: string;
  scheduledAppointmentsCount: number;
  clinicsAssignedCount: number;
  pic: string; // Person in Charge (Manager Name)
  status: 'active' | 'inactive';
  organizationName?: string;
  createdAt: Date;
}

export class PaginatedComplexesResponseDto {
  success: boolean;
  message: string;
  data: {
    complexes: ComplexListItemDto[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}