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
  complex?: any; // Complex document
  clinic?: any; // Clinic document
  createdEntities: string[]; // Array of entity types created (e.g., ['organization', 'complex', 'clinic'])
}
