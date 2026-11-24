import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProfileService } from '../../domain/services/profile.service';
import { SaveProfileDto } from '../../application/dto/profile.dto';
import { UserRole } from '../../domain/entities/user.entity';
import { Roles } from '../decorators/roles.decorator';

@ApiTags('Perfiles')
@ApiBearerAuth('JWT-auth')
@Roles(UserRole.ADMIN)
@Controller('profiles')
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Post()
  create(@Body() dto: SaveProfileDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveProfileDto) { return this.service.update(id, dto); }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
