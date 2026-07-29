import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: number | string;
  email: string;
  role: string;
  establishmentId?: number | null;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'change-me'),
    });
  }

  async validate(payload: JwtPayload) {
    return {
      id:              Number(payload.sub),       // siempre número
      sub:             Number(payload.sub),       // alias por compatibilidad
      email:           payload.email,
      role:            payload.role,
      establishmentId: payload.establishmentId ?? null,
    };
  }
}
