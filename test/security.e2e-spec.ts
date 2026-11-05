import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { CompanySettingsEntity } from '../src/domain/entities/company-settings.entity';
import { CompanySettingsService } from '../src/domain/services/company-settings.service';

/** Requiere una base de datos de prueba: las migraciones crean los usuarios por defecto. */
describe('Seguridad de la API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let cashierToken: string;

  const http = () => request(app.getHttpServer());
  const login = async (email: string, password: string) =>
    (await http().post('/api/v1/auth/login').send({ email, password }).expect(200)).body.token;
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    // Igual que api/index.ts: ningún guard se registra aquí, deben venir de AppModule
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    await app.get(CompanySettingsService).get();
    await app.get(DataSource).getRepository(CompanySettingsEntity).update(1, {
      claveSol: 'clave-sol',
      sunatApiUrl: 'http://127.0.0.1:9',
      sunatApiKey: 'api-key-1234',
      sunatApiSecret: 'api-secret',
      sunatClientSecret: 'client-secret',
      certificadoPassword: 'cert-password',
      certificadoUrl: '/uploads/certificates/cert.p12',
    });

    adminToken = await login('admin@sgll.com', 'admin123');
    cashierToken = await login('cajero@sgll.com', 'cajero123');
  }, 60_000);

  afterAll(() => app?.close());

  it.each([
    ['get', '/api/v1/users'],
    ['get', '/api/v1/sales'],
    ['get', '/api/v1/products'],
    ['get', '/api/v1/company-settings'],
    ['post', '/api/v1/company-settings/sync'],
  ] as const)('rechaza %s %s sin token', async (method, url) => {
    await http()[method](url).expect(401);
  });

  it('mantiene públicas las rutas de salud y login', async () => {
    await http().get('/api/v1/health').expect(200);
  });

  it.each([
    ['get', '/api/v1/users'],
    ['post', '/api/v1/users'],
    ['put', '/api/v1/company-settings'],
    ['put', '/api/v1/company-settings/void-pin'],
    ['post', '/api/v1/company-settings/sync'],
    ['post', '/api/v1/company-settings/logo'],
    ['post', '/api/v1/company-settings/register-sunat-api'],
    ['post', '/api/v1/establishments'],
    ['post', '/api/v1/establishments/series'],
  ] as const)('rechaza %s %s para un cajero', async (method, url) => {
    await http()[method](url).set(as(cashierToken)).expect(403);
  });

  it('no entrega secretos a ningún rol', async () => {
    for (const token of [adminToken, cashierToken]) {
      const { text } = await http().get('/api/v1/company-settings').set(as(token)).expect(200);
      for (const secret of ['clave-sol', 'api-key-1234', 'api-secret', 'client-secret', 'cert-password', 'cert.p12']) {
        expect(text).not.toContain(secret);
      }
    }
  });

  it('muestra al administrador la API key enmascarada y nada al cajero', async () => {
    const admin = await http().get('/api/v1/company-settings').set(as(adminToken)).expect(200);
    const cashier = await http().get('/api/v1/company-settings').set(as(cashierToken)).expect(200);
    expect(admin.body.sunatApiKey).toBe('••••1234');
    expect(cashier.body.sunatApiKey).toBeUndefined();
    expect(cashier.body.sunatApiUrl).toBeUndefined();
  });

  it('no borra la Clave SOL si el formulario la envía vacía', async () => {
    const res = await http()
      .put('/api/v1/company-settings').set(as(adminToken)).send({ claveSol: '', telefono: '999' }).expect(200);
    expect(res.text).not.toContain('clave-sol');

    const stored = await app.get(CompanySettingsService).get();
    expect(stored.claveSol).toBe('clave-sol');
    expect(stored.telefono).toBe('999');
  });

  it('no envía las credenciales guardadas a otra URL', async () => {
    await http()
      .post('/api/v1/company-settings/sync').set(as(adminToken))
      .send({ apiUrl: 'https://atacante.example' }).expect(400);
  });

  describe('anulación de ventas', () => {
    const saleId = 999999; // inexistente: un 404 significa que pasó la autorización
    const voidSale = (token: string, pin?: string) =>
      http().patch(`/api/v1/sales/${saleId}/void`).set(as(token)).send({ reason: 'Prueba', pin });

    it('sin clave configurada solo permite al administrador', async () => {
      await voidSale(cashierToken).expect(403);
      await voidSale(cashierToken, '9876').expect(403);
      await voidSale(adminToken).expect(404);
    });

    it('con clave configurada la exige a todos los roles', async () => {
      await http().put('/api/v1/company-settings/void-pin').set(as(adminToken)).send({ pin: '123' }).expect(400);
      await http().put('/api/v1/company-settings/void-pin').set(as(adminToken)).send({ pin: '4821' }).expect(200);

      await voidSale(adminToken).expect(403);
      await voidSale(cashierToken, '9876').expect(403);
      await voidSale(cashierToken, '4821').expect(404);
      await voidSale(adminToken, '4821').expect(404);
    });

    it('informa si hay clave sin exponer el hash', async () => {
      const { body, text } = await http().get('/api/v1/company-settings').set(as(cashierToken)).expect(200);
      expect(body.hasVoidPin).toBe(true);
      expect(text).not.toContain('$2');
    });
  });

  it('no ejecuta comandos inyectados en la clave del certificado', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cert-'));
    const marker = join(dir, 'inyectado');
    const cert = join(dir, 'cert.p12');
    writeFileSync(cert, 'no es un certificado');

    const service: any = app.get(CompanySettingsService);
    expect(service.normalizeCertificatePath(cert, `x"; touch "${marker}"; echo "`)).toBe(cert);
    expect(existsSync(marker)).toBe(false);

    rmSync(dir, { recursive: true });
  });
});
