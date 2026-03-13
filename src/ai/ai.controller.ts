import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { GenerateQuestionDto } from './dto/generate-question.dto';
import { EvaluateAnswerDto } from './dto/evaluate-answer.dto';
import { Public } from 'src/auth/decorators/public.decorator';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-question')
  @Public()
  async generateQuestion(@Body() dto: GenerateQuestionDto) {
    const question = await this.aiService.generateQuestion(
      dto.topic,
      dto.difficulty,
    );
    return { question };
  }

  @Post('evaluate-answer')
  @Public()
  async evaluateAnswer(@Body() dto: EvaluateAnswerDto) {
    const evaluation = await this.aiService.evaluateAnswer(
      dto.question,
      dto.answer,
    );
    return { evaluation: JSON.parse(evaluation) };
  }

  @Post('generate-feedback')
  @Public()
  async generateFeedback(@Body() dto: EvaluateAnswerDto) {
    const feedback = await this.aiService.generateFeedback(
      dto.question,
      dto.answer,
    );
    return { feedback };
  }
}
