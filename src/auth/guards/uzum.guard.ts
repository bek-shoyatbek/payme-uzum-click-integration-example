import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class UzumBasicAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException("Token doesn't exist");
    }
    try {
      const decoded = this.decodeToken(token);
      if (!decoded)
        throw new UnauthorizedException("Basic token doesn't exist");

      const [username, password] = decoded.split(':');

      const isValidUsername =
        this.configService.get<string>('UZUM_USERNAME') === username;
      const isValidPassword =
        this.configService.get<string>('UZUM_PASSWORD') === password;

      if (!isValidUsername || !isValidPassword) {
        throw new UnauthorizedException();
      }
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers['authorization']?.split(' ') ?? [];

    return type === 'Basic' ? token : undefined;
  }

  private decodeToken(token: string) {
    return token?.length > 0 ? atob(token) : undefined;
  }
}
