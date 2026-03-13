import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as CacheManagerTypes from 'cache-manager';
import { Interview, InterviewStatus } from './entities/interview.entity';
import { InterviewItem, ItemStatus } from './entities/interview-item.entity';
import { StartInterviewDto } from './dto/start-interview.dto';
import { INTERVIEW_QUEUE, InterviewJobData } from './interview.processor';

@Injectable()
export class InterviewService {
  constructor(
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(InterviewItem)
    private readonly itemRepository: Repository<InterviewItem>,
    @InjectQueue(INTERVIEW_QUEUE)
    private readonly interviewQueue: Queue<InterviewJobData>,
    @Inject(CACHE_MANAGER)
    private readonly cache: CacheManagerTypes.Cache,
  ) {}

  async start(userId: number, dto: StartInterviewDto): Promise<Interview> {
    const interview = this.interviewRepository.create({
      title: dto.title,
      topic: dto.topic,
      difficulty: dto.difficulty,
      userId,
    });

    return this.interviewRepository.save(interview);
  }

  async generateNextQuestion(
    interviewId: string,
    userId: number,
  ): Promise<InterviewItem> {
    const interview = await this.getActiveInterview(interviewId, userId);

    const item = this.itemRepository.create({
      interviewId: interview.id,
      status: ItemStatus.GENERATING,
      order: interview.items?.length ?? 0,
    });

    const savedItem = await this.itemRepository.save(item);

    await this.interviewQueue.add('generate-question', {
      type: 'generate-question',
      itemId: savedItem.id,
      topic: interview.topic,
      difficulty: interview.difficulty as 'junior' | 'mid' | 'senior',
    });

    return savedItem;
  }

  async submitAnswer(
    interviewId: string,
    itemId: string,
    userId: number,
    answer: string,
  ) {
    await this.getActiveInterview(interviewId, userId);

    const item = await this.itemRepository.findOne({
      where: { id: itemId, interviewId },
    });

    if (!item) {
      throw new NotFoundException('Question not found');
    }

    if (item.status === ItemStatus.GENERATING) {
      throw new BadRequestException('Question is still being generated');
    }

    if (item.answer) {
      throw new BadRequestException('This question has already been answered');
    }

    item.answer = answer;
    item.status = ItemStatus.PROCESSING;
    const savedItem = await this.itemRepository.save(item);

    await this.interviewQueue.add('process-answer', {
      type: 'process-answer',
      itemId: savedItem.id,
      interviewId,
      question: item.question!,
      answer,
    });

    return savedItem;
  }

  async end(interviewId: string, userId: number): Promise<Interview> {
    const interview = await this.getActiveInterview(interviewId, userId);

    const items = await this.itemRepository.find({
      where: { interviewId },
    });

    const hasProcessing = items.some(
      (i) =>
        i.status === ItemStatus.GENERATING ||
        i.status === ItemStatus.PROCESSING,
    );

    if (hasProcessing) {
      throw new BadRequestException(
        'Cannot end interview while questions are still being processed',
      );
    }

    const scores = items
      .map((item) => item.evaluation?.score)
      .filter((s): s is number => s != null);

    interview.overallScore = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;
    interview.status = InterviewStatus.COMPLETED;

    const saved = await this.interviewRepository.save(interview);
    await this.cache.del(`reports:user:${userId}`);
    return saved;
  }

  async findAllByUser(userId: number) {
    return this.interviewRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'title',
        'topic',
        'difficulty',
        'status',
        'overallScore',
        'createdAt',
      ],
    });
  }

  async findOne(id: string, userId: number): Promise<Interview> {
    const interview = await this.interviewRepository.findOne({
      where: { id, userId },
      relations: ['items'],
      order: { items: { order: 'ASC' } },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    return interview;
  }

  private async getActiveInterview(
    interviewId: string,
    userId: number,
  ): Promise<Interview> {
    const interview = await this.interviewRepository.findOne({
      where: { id: interviewId, userId },
      relations: ['items'],
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    if (interview.status === InterviewStatus.COMPLETED) {
      throw new BadRequestException('This interview session has already ended');
    }

    return interview;
  }
}
