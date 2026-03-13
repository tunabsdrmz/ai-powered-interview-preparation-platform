import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { InterviewItem } from './interview-item.entity';

export enum InterviewStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity()
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  topic: string;

  @Column()
  difficulty: string;

  @Column({
    type: 'enum',
    enum: InterviewStatus,
    default: InterviewStatus.IN_PROGRESS,
  })
  status: InterviewStatus;

  @Column({ type: 'float', nullable: true })
  overallScore: number | null;

  @ManyToOne(() => User, (user) => user.interviews, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: number;

  @OneToMany(() => InterviewItem, (item: InterviewItem) => item.interview, {
    cascade: true,
  })
  items: InterviewItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
