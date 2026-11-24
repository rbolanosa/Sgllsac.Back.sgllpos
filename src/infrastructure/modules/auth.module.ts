import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { ProfileService } from '../../domain/services/profile.service';
import { ProfileController } from '../controllers/profile.controller';
import { RolesGuard } from '../guards/roles.guard';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../../domain/services/auth.service';
import { UserEntity } from '../../domain/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'change-me'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '8h') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController, ProfileController],
  providers: [
    AuthService,
    ProfileService,
    JwtStrategy,
    JwtAuthGuard,
    // Globales para main.ts y api/index.ts. El orden importa: primero JWT, luego permisos del perfil y al final roles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtModule, PassportModule, JwtAuthGuard, AuthService, ProfileService],
})
export class AuthModule {}
