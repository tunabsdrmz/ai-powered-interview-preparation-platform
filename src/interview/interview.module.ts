import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { InterviewProcessor, INTERVIEW_QUEUE } from './interview.processor';
import { Interview } from './entities/interview.entity';
import { InterviewItem } from './entities/interview-item.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Interview, InterviewItem]),
    BullModule.registerQueue({ name: INTERVIEW_QUEUE }),
    AiModule,
  ],
  controllers: [InterviewController],
  providers: [InterviewService, InterviewProcessor],
  exports: [InterviewService],
})
export class InterviewModule {}
