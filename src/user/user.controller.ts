import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { currentUser } from 'src/auth/decorators/current-user.decorator';
import type { UserContext } from 'src/auth/types/auth.types';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  async me(@currentUser() user: UserContext) {
    return this.userService.me(user);
  }
}
