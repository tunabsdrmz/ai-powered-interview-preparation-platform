import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { from, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Önce JWT validation - user request'e eklensin
    const jwtActivation = super.canActivate(context);
    const activation$ =
      typeof jwtActivation === 'boolean'
        ? of(jwtActivation)
        : from(jwtActivation);

    if (requiredRoles?.length) {
      return activation$.pipe(
        switchMap((result) => {
          if (!result) return of(false);
          const { user } = context.switchToHttp().getRequest();
          return of(requiredRoles.some((role) => user?.role === role));
        }),
      );
    }

    return activation$;
  }
}
