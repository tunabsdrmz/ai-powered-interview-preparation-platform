import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Interview } from './interview.entity';

export enum ItemStatus {
  GENERATING = 'generating',
  AWAITING_ANSWER = 'awaiting_answer',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
}

@Entity()
export class InterviewItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { nullable: true })
  question: string | null;

  @Column('text', { nullable: true })
  answer: string | null;

  @Column({ type: 'jsonb', nullable: true })
  evaluation: {
    score: number;
    strengths: string[];
    weaknesses: string[];
    correctness: string;
  } | null;

  @Column('text', { nullable: true })
  feedback: string | null;

  @Column({
    type: 'enum',
    enum: ItemStatus,
    default: ItemStatus.GENERATING,
  })
  status: ItemStatus;

  @Column({ default: 0 })
  order: number;

  @ManyToOne(() => Interview, (interview) => interview.items, {
    onDelete: 'CASCADE',
  })
  interview: Interview;

  @Column()
  interviewId: string;
}
