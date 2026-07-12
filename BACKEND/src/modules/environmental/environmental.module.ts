import { Module } from '@nestjs/common';
import { EmissionFactorsController } from './factors/emission-factors.controller';
import { EmissionFactorsService } from './factors/emission-factors.service';
import { GoalsController } from './goals/goals.controller';
import { GoalsService } from './goals/goals.service';

/**
 * Environmental domain (B2 slice): emission factors + goals.
 * Operational records and carbon transactions arrive in a later phase.
 */
@Module({
  controllers: [EmissionFactorsController, GoalsController],
  providers: [EmissionFactorsService, GoalsService],
  exports: [EmissionFactorsService, GoalsService],
})
export class EnvironmentalModule {}
