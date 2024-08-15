import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { PaymeError } from 'src/payme/constants/payme-error';


// ! Payme dan kelayotgan so'rovlarni tekshirib va server xavfsizligini taminlash uchun
@Injectable()
export class PaymeBasicAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const token = this.extractTokenFromHeader(request);
    const transId = request?.body?.id;

 // Paymega qaytadigan hatolar status kodi doim 200 bo'lishi lozim !
    if (!token) {
      response.status(200).send({
        id: transId,
        error: PaymeError.InvalidAuthorization,
      });
      return;
    }
    try {
      const decoded = this.decodeToken(token);
      if (!decoded) {
        response.status(200).send({
          id: transId,
          error: PaymeError.InvalidAuthorization,
        });
        return;
      }

      const [username, password] = decoded.split(':');

      const isValidUsername =
        this.configService.get<string>('PAYME_LOGIN') === username;
      // ! production mode da passwordni o'zgartishni unutmang
      const isValidPassword =
        this.configService.get<string>('PAYME_PASSWORD_TEST') === password;

      if (!isValidUsername || !isValidPassword) {
        response.status(200).send({
          id: transId,
          error: PaymeError.InvalidAuthorization,
        });
        return;
      }
    } catch {
      response.status(200).send({
        id: transId,
        error: PaymeError.InvalidAuthorization,
      });
      return;
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
