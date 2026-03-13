import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitAnswerDto {
  @ApiProperty({ example: 'The event loop handles async operations by...' })
  @IsString()
  answer: string;
}
