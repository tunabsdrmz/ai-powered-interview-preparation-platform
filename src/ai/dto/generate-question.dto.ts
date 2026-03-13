import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateQuestionDto {
  @ApiProperty({ example: 'Node.js' })
  @IsString()
  topic: string;

  @ApiProperty({ enum: ['junior', 'mid', 'senior'], example: 'mid' })
  @IsIn(['junior', 'mid', 'senior'])
  difficulty: 'junior' | 'mid' | 'senior';
}
