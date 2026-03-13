import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Interview } from '../../interview/entities/interview.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: ['user', 'admin'], default: 'user' })
  role: string;

  @OneToMany(() => Interview, (interview) => interview.user)
  interviews: Interview[];
}
