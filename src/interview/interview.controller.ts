import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InterviewService } from './interview.service';
import { StartInterviewDto } from './dto/start-interview.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { currentUser } from '../auth/decorators/current-user.decorator';
import type { UserContext } from '../auth/types/auth.types';

@ApiTags('interviews')
@ApiBearerAuth()
@Controller('interviews')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post('start')
  async start(
    @currentUser() user: UserContext,
    @Body() dto: StartInterviewDto,
  ) {
    return this.interviewService.start(+user.sub, dto);
  }

  @Post(':interviewId/questions')
  async generateNextQuestion(
    @currentUser() user: UserContext,
    @Param('interviewId', ParseUUIDPipe) interviewId: string,
  ) {
    return this.interviewService.generateNextQuestion(interviewId, +user.sub);
  }

  @Post(':interviewId/questions/:itemId/answer')
  async submitAnswer(
    @currentUser() user: UserContext,
    @Param('interviewId', ParseUUIDPipe) interviewId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.interviewService.submitAnswer(
      interviewId,
      itemId,
      +user.sub,
      dto.answer,
    );
  }

  @Post(':interviewId/end')
  async end(
    @currentUser() user: UserContext,
    @Param('interviewId', ParseUUIDPipe) interviewId: string,
  ) {
    return this.interviewService.end(interviewId, +user.sub);
  }

  @Get()
  async findAll(@currentUser() user: UserContext) {
    return this.interviewService.findAllByUser(+user.sub);
  }

  @Get(':id')
  async findOne(
    @currentUser() user: UserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.interviewService.findOne(id, +user.sub);
  }
}
