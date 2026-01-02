import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { RabbitmqModule } from '../modules/rabbitmq/rabbitmq.module';

@Module({
  imports: [RabbitmqModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}

