import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserContext } from '../types/auth.types';

export const currentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: UserContext }>();
    return request.user as UserContext | undefined;
  },
);
