import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from '../entities/user.entity';
import { CreateUserDto, UpdateUserDto } from '../../application/dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async findAll() {
    return this.userRepo.find({
      select: { id: true, name: true, email: true, role: true, establishmentId: true, isActive: true, createdAt: true, updatedAt: true },
      order: { createdAt: 'DESC' },
    });
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

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      ...dto,
      password: hashedPassword,
    });
    await this.userRepo.save(user);

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

    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.establishmentId !== undefined) user.establishmentId = dto.establishmentId;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    await this.userRepo.save(user);

    const { password, ...result } = user;
    return result;
  }

  async remove(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Usuario #${id} no encontrado`);

    user.isActive = false;
    await this.userRepo.save(user);
    return { message: `Usuario #${id} desactivado correctamente` };
  }
}
