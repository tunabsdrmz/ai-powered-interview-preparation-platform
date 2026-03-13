import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { currentUser } from '../auth/decorators/current-user.decorator';
import type { UserContext } from '../auth/types/auth.types';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  async getUserReports(@currentUser() user: UserContext) {
    return this.reportService.getUserReports(+user.sub);
  }

  @Get(':id')
  async getReportById(
    @currentUser() user: UserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportService.getReportById(id, +user.sub);
  }
}
