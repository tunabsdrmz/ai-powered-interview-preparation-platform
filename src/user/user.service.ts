import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import type { UserContext } from 'src/auth/types/auth.types';
import { currentUser } from 'src/auth/decorators/current-user.decorator';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async me(@currentUser() user: UserContext) {
    return { success: true, message: 'User fetched successfully', data: user };
  }
}
