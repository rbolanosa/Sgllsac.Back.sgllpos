import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { cleanPermissions, DEFAULT_PROFILE, MODULES, Permissions, SYSTEM_PROFILES } from '../constants/permissions';
import { SaveProfileDto } from '../../application/dto/profile.dto';

export interface Access { role: string; active: boolean; permissions: Permissions; profileName: string }

const parse = (v: any): Permissions => {
  try { return cleanPermissions(typeof v === 'string' ? JSON.parse(v) : v); } catch { return {}; }
};

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);
  /** Unos segundos: evita consultar en cada llamada sin demorar los cambios */
  private cache = new Map<number, { at: number; access: Access | null }>();
  private readonly ttl = 10_000;

  constructor(private readonly ds: DataSource) {}

  private clear() { this.cache.clear(); }
  forget(userId: number) { this.cache.delete(userId); }

  /** Acceso real del usuario según la base (no según lo que diga su sesión) */
  async accessOf(userId: number): Promise<Access | null> {
    const hit = this.cache.get(userId);
    if (hit && Date.now() - hit.at < this.ttl) return hit.access;
    const [u] = await this.ds.query('SELECT role, is_active AS active FROM users WHERE id = ?', [userId]);
    const access: Access | null = u ? { role: u.role, active: !!Number(u.active), permissions: {}, profileName: 'Administrador' } : null;
    if (access && access.role !== 'admin') {
      const key = DEFAULT_PROFILE[access.role] ?? 'consulta';
      let row: any;
      let missing = false;
      try {
        // El perfil asignado; si no tiene, el de fábrica de su rol
        [row] = await this.ds.query(
          `SELECT name, active, permissions FROM profiles
           WHERE id = (SELECT profile_id FROM user_profiles WHERE user_id = ?)`, [userId]);
        if (!row) [row] = await this.ds.query('SELECT name, active, permissions FROM profiles WHERE system_key = ?', [key]);
      } catch (e: any) {
        if (e?.code !== 'ER_NO_SUCH_TABLE') throw e;
        missing = true;
        this.logger.warn('Sin tablas de perfiles: se usan los de fábrica');
      }
      const factory = SYSTEM_PROFILES[key];
      access.profileName = row?.name ?? factory.name;
      if (row) access.permissions = Number(row.active) ? parse(row.permissions) : {};
      else access.permissions = missing ? factory.permissions : {};
    }
    if (this.cache.size > 500) this.cache.clear();
    this.cache.set(userId, { at: Date.now(), access });
    return access;
  }

  async findAll() {
    const rows = await this.ds.query(
      `SELECT p.id, p.system_key AS systemKey, p.name, p.description, p.active, p.permissions,
        (SELECT COUNT(*) FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id
         WHERE u.is_active = 1 AND u.role <> 'admin' AND (up.profile_id = p.id
           OR (up.profile_id IS NULL AND ((u.role = 'cashier' AND p.system_key = 'cajero')
             OR (u.role = 'viewer' AND p.system_key = 'consulta'))))) AS userCount
       FROM profiles p ORDER BY p.id`);
    const [admins] = await this.ds.query("SELECT COUNT(*) AS n FROM users WHERE is_active = 1 AND role = 'admin'");
    return {
      modules: MODULES,
      adminCount: Number(admins.n),
      profiles: rows.map((r: any) => ({
        ...r, active: !!Number(r.active), userCount: Number(r.userCount), permissions: parse(r.permissions),
      })),
    };
  }

  private async assertName(name: string, id = 0) {
    if (name.toLowerCase() === 'administrador') throw new BadRequestException('"Administrador" es un nombre reservado');
    const [dup] = await this.ds.query('SELECT id FROM profiles WHERE name = ? AND id <> ?', [name, id]);
    if (dup) throw new BadRequestException('Ya existe un perfil con ese nombre');
  }

  async create(dto: SaveProfileDto) {
    const name = dto.name.trim();
    await this.assertName(name);
    const res = await this.ds.query('INSERT INTO profiles (name, description, active, permissions) VALUES (?,?,?,?)',
      [name, dto.description?.trim() || null, dto.active === false ? 0 : 1, JSON.stringify(cleanPermissions(dto.permissions))]);
    return { id: Number(res.insertId) };
  }

  async update(id: number, dto: SaveProfileDto) {
    const [p] = await this.ds.query('SELECT id, system_key AS systemKey FROM profiles WHERE id = ?', [id]);
    if (!p) throw new NotFoundException('Perfil no encontrado');
    const name = dto.name.trim();
    await this.assertName(name, id);
    await this.ds.query('UPDATE profiles SET name=?, description=?, active=?, permissions=? WHERE id=?',
      [name, dto.description?.trim() || null, dto.active === false ? 0 : 1, JSON.stringify(cleanPermissions(dto.permissions)), id]);
    this.clear();
    return { id };
  }

  async remove(id: number) {
    const [p] = await this.ds.query('SELECT system_key AS systemKey FROM profiles WHERE id = ?', [id]);
    if (!p) throw new NotFoundException('Perfil no encontrado');
    if (p.systemKey) throw new BadRequestException('Los perfiles de fábrica no se eliminan; puedes desactivarlos');
    const [u] = await this.ds.query('SELECT COUNT(*) AS n FROM user_profiles WHERE profile_id = ?', [id]);
    if (Number(u.n)) throw new BadRequestException('Hay usuarios con este perfil: cámbiales el perfil primero');
    await this.ds.query('DELETE FROM profiles WHERE id = ?', [id]);
    this.clear();
    return { id };
  }

  async assertExists(profileId: number) {
    const [p] = await this.ds.query('SELECT id FROM profiles WHERE id = ?', [profileId]);
    if (!p) throw new BadRequestException('El perfil elegido no existe');
  }

  async assign(userId: number, profileId: number | null) {
    if (profileId) {
      await this.ds.query('INSERT INTO user_profiles (user_id, profile_id) VALUES (?,?) ON DUPLICATE KEY UPDATE profile_id = ?',
        [userId, profileId, profileId]);
    } else {
      await this.ds.query('DELETE FROM user_profiles WHERE user_id = ?', [userId]);
    }
    this.forget(userId);
  }

  async assignments(): Promise<Map<number, number>> {
    const rows = await this.ds.query('SELECT user_id AS u, profile_id AS p FROM user_profiles').catch(() => []);
    return new Map(rows.map((r: any) => [Number(r.u), Number(r.p)]));
  }
}
