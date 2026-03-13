import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as CacheManagerTypes from 'cache-manager';
import {
  Interview,
  InterviewStatus,
} from '../interview/entities/interview.entity';

const REPORTS_LIST_TTL = 60;
const REPORT_DETAIL_TTL = 300;

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @Inject(CACHE_MANAGER)
    private readonly cache: CacheManagerTypes.Cache,
  ) {}

  async getUserReports(userId: number) {
    const cacheKey = `reports:user:${userId}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const reports = await this.interviewRepository.find({
      where: { userId, status: InterviewStatus.COMPLETED },
      order: { updatedAt: 'DESC' },
      select: [
        'id',
        'title',
        'topic',
        'difficulty',
        'overallScore',
        'createdAt',
        'updatedAt',
      ],
    });

    await this.cache.set(cacheKey, reports, REPORTS_LIST_TTL);
    return reports;
  }

  async getReportById(id: string, userId: number) {
    const cacheKey = `reports:detail:${id}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const report = await this.interviewRepository.findOne({
      where: { id, userId, status: InterviewStatus.COMPLETED },
      relations: ['items'],
      order: { items: { order: 'ASC' } },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    await this.cache.set(cacheKey, report, REPORT_DETAIL_TTL);
    return report;
  }

  async invalidateUserReports(userId: number) {
    await this.cache.del(`reports:user:${userId}`);
  }
}
