import { Module } from '@nestjs/common';
import { EmissionFactorsController } from './factors/emission-factors.controller';
import { EmissionFactorsService } from './factors/emission-factors.service';
import { GoalsController } from './goals/goals.controller';
import { GoalsService } from './goals/goals.service';
import { CarbonController } from './carbon/carbon.controller';
import { CarbonService } from './carbon/carbon.service';
import { OperationalRecordsController } from './operational-records/operational-records.controller';
import { OperationalRecordsService } from './operational-records/operational-records.service';

/**
 * Environmental domain: emission factors, goals, operational records, and the
 * carbon calculation engine (W1). Records auto-create snapshotted carbon
 * transactions when auto_emission_calc is ON.
 */
@Module({
  controllers: [
    EmissionFactorsController,
    GoalsController,
    OperationalRecordsController,
    CarbonController,
  ],
  providers: [
    EmissionFactorsService,
    GoalsService,
    CarbonService,
    OperationalRecordsService,
  ],
  exports: [EmissionFactorsService, GoalsService, CarbonService],
})
export class EnvironmentalModule {}
