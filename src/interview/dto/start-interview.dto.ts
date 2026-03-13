import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartInterviewDto {
  @ApiProperty({ example: 'Node.js Mid-Level Interview' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Node.js' })
  @IsString()
  topic: string;

  @ApiProperty({ enum: ['junior', 'mid', 'senior'], example: 'mid' })
  @IsIn(['junior', 'mid', 'senior'])
  difficulty: 'junior' | 'mid' | 'senior';
}
