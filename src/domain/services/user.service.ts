import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ProfileService } from './profile.service';
import { UserEntity, UserRole } from '../entities/user.entity';
import { CreateUserDto, UpdateUserDto } from '../../application/dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly profiles: ProfileService,
  ) {}

  /** Nunca se queda el sistema sin un administrador activo */
  private async assertNotLastAdmin(user: UserEntity) {
    if (user.role !== UserRole.ADMIN || !user.isActive) return;
    const admins = await this.userRepo.count({ where: { role: UserRole.ADMIN, isActive: true } });
    if (admins <= 1) throw new BadRequestException('Es el único administrador activo: no se puede desactivar ni cambiar de perfil');
  }

  async findAll() {
    const users = await this.userRepo.find({
      select: { id: true, name: true, email: true, role: true, establishmentId: true, isActive: true, createdAt: true, updatedAt: true },
      order: { createdAt: 'DESC' },
    });
    const assigned = await this.profiles.assignments();
    return users.map((u) => ({ ...u, profileId: assigned.get(u.id) ?? null }));
  }

  async findOne(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      select: { id: true, name: true, email: true, role: true, establishmentId: true, isActive: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw new NotFoundException(`Usuario #${id} no encontrado`);
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('El correo ya está registrado por otro usuario');

    const { profileId, ...data } = dto;
    if (profileId) await this.profiles.assertExists(profileId);

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      ...data,
      password: hashedPassword,
    });
    await this.userRepo.save(user);
    if (profileId && user.role !== UserRole.ADMIN) await this.profiles.assign(user.id, profileId);

    const { password, ...result } = user;
    return result;
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Usuario #${id} no encontrado`);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepo.findOne({ where: { email: dto.email } });
      if (existing) throw new BadRequestException('El correo ya está registrado por otro usuario');
    }

    const losesAdmin = (dto.role !== undefined && dto.role !== UserRole.ADMIN) || dto.isActive === false;
    if (losesAdmin) await this.assertNotLastAdmin(user);
    if (dto.profileId) await this.profiles.assertExists(dto.profileId);

    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.establishmentId !== undefined) user.establishmentId = dto.establishmentId;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    await this.userRepo.save(user);
    if (user.role === UserRole.ADMIN) await this.profiles.assign(id, null).catch(() => null);
    else if (dto.profileId !== undefined) await this.profiles.assign(id, dto.profileId);
    this.profiles.forget(id);

    const { password, ...result } = user;
    return result;
  }

  async remove(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Usuario #${id} no encontrado`);

    await this.assertNotLastAdmin(user);
    user.isActive = false;
    await this.userRepo.save(user);
    this.profiles.forget(id);
    return { message: `Usuario #${id} desactivado correctamente` };
  }
}
