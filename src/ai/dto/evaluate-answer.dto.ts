import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EvaluateAnswerDto {
  @ApiProperty({ example: 'What is the event loop in Node.js?' })
  @IsString()
  question: string;

  @ApiProperty({ example: 'The event loop is a mechanism that...' })
  @IsString()
  answer: string;
}
