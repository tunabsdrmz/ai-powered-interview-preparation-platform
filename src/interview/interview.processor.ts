import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { InterviewItem, ItemStatus } from './entities/interview-item.entity';
import { Interview } from './entities/interview.entity';
import { AiService } from '../ai/ai.service';

export const INTERVIEW_QUEUE = 'interview';

export type GenerateQuestionJob = {
  type: 'generate-question';
  itemId: string;
  topic: string;
  difficulty: 'junior' | 'mid' | 'senior';
};

export type ProcessAnswerJob = {
  type: 'process-answer';
  itemId: string;
  interviewId: string;
  question: string;
  answer: string;
};

export type InterviewJobData = GenerateQuestionJob | ProcessAnswerJob;

@Processor(INTERVIEW_QUEUE)
export class InterviewProcessor extends WorkerHost {
  private readonly logger = new Logger(InterviewProcessor.name);

  constructor(
    @InjectRepository(InterviewItem)
    private readonly itemRepository: Repository<InterviewItem>,
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    private readonly aiService: AiService,
  ) {
    super();
  }

  async process(job: Job<InterviewJobData>) {
    switch (job.data.type) {
      case 'generate-question':
        return this.handleGenerateQuestion(job.data);
      case 'process-answer':
        return this.handleProcessAnswer(job.data);
    }
  }

  private async handleGenerateQuestion(data: GenerateQuestionJob) {
    this.logger.log(`Generating question for item ${data.itemId}`);

    try {
      const question = await this.aiService.generateQuestion(
        data.topic,
        data.difficulty,
      );

      await this.itemRepository.update(data.itemId, {
        question,
        status: ItemStatus.AWAITING_ANSWER,
      });
    } catch (error) {
      this.logger.error(
        `Failed to generate question for item ${data.itemId}`,
        error,
      );
      throw error;
    }
  }

  private async handleProcessAnswer(data: ProcessAnswerJob) {
    this.logger.log(`Processing answer for item ${data.itemId}`);

    try {
      const [evaluationRaw, feedback] = await Promise.all([
        this.aiService.evaluateAnswer(data.question, data.answer),
        this.aiService.generateFeedback(data.question, data.answer),
      ]);

      let evaluation: InterviewItem['evaluation'];
      try {
        evaluation = JSON.parse(evaluationRaw);
      } catch {
        evaluation = null;
      }

      await this.itemRepository.update(data.itemId, {
        evaluation,
        feedback,
        status: ItemStatus.COMPLETED,
      });
    } catch (error) {
      this.logger.error(
        `Failed to process answer for item ${data.itemId}`,
        error,
      );
      throw error;
    }
  }
}
