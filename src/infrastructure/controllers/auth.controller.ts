import { Controller, Post, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Public } from '../decorators/public.decorator';
import { ProfileService } from '../../domain/services/profile.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthService } from '../../domain/services/auth.service';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly profiles: ProfileService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión y obtener token JWT' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('me')
  @ApiOperation({ summary: 'Rol, perfil y permisos vigentes del usuario' })
  async me(@CurrentUser('id') id: number) {
    const a = await this.profiles.accessOf(id);
    return { role: a?.role, profileName: a?.profileName, permissions: a?.permissions ?? {} };
  }

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Verificar estado del servicio de autenticación' })
  status() {
    return { status: 'ok', service: 'auth' };
  }
}
