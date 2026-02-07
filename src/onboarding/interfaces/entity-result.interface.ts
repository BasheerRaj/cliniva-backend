/**
 * Entity Result Interface
 *
 * Result of entity creation operations.
 * Used by OnboardingEntityFactoryService to return created entities.
 *
 * Contains references to created organization, complex, and/or clinic
 * based on the plan type.
 */
export interface EntityResult {
  organization?: any; // Organization document
  complex?: any; // Complex document (single)
  complexes?: any[]; // Complex documents (array for company/complex plans)
  clinic?: any; // Clinic document (single)
  clinics?: any[]; // Clinic documents (array)
  departments?: any[]; // Department documents (array)
  services?: any[]; // Service documents (array)
  createdEntities: string[]; // Array of entity types created (e.g., ['organization', 'complex', 'clinic'])
}
