import { Module } from '@nestjs/common';
import { ValidationUtil } from './utils/validation.util';
import { EntityRelationshipUtil } from './utils/entity-relationship.util';
import { PlanConfigUtil } from './utils/plan-config.util';
import { DataTransformerUtil } from './utils/data-transformer.util';

@Module({
  providers: [
    ValidationUtil,
    EntityRelationshipUtil,
    PlanConfigUtil,
    DataTransformerUtil,
  ],
  exports: [
    ValidationUtil,
    EntityRelationshipUtil,
    PlanConfigUtil,
    DataTransformerUtil,
  ],
})
export class CommonModule {}
