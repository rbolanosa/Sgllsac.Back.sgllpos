import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/** Requiere una base de datos de prueba con el usuario admin@sgll.com / admin123. */
describe('Presentaciones de producto (e2e)', () => {
  let app: INestApplication;
  let auth: { Authorization: string };
  let productId: number;
  let paquete: number;
  let kilo: number;
  const suffix = Date.now();

  const http = () => request(app.getHttpServer());
  const stock = async () =>
    Number(
      (await http().get(`/api/v1/products/${productId}`).set(auth).expect(200))
        .body.stockQuantity,
    );
  const sell = (items: object[]) =>
    http()
      .post('/api/v1/sales')
      .set(auth)
      .send({
        documentType: 'nota_venta',
        paymentMethod: 'cash',
        items: items.map((i) => ({ productId, ...i })),
      });
  const voidSale = (id: number) =>
    http()
      .patch(`/api/v1/sales/${id}/void`)
      .set(auth)
      .send({ reason: 'Prueba', pin: process.env.TEST_VOID_PIN });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'admin@sgll.com', password: 'admin123' })
      .expect(200);
    auth = { Authorization: `Bearer ${login.body.token}` };

    const created = await http()
      .post('/api/v1/products')
      .set(auth)
      .send({
        name: `Fideos ${suffix}`,
        barcode: `U${suffix}`,
        costPrice: 1,
        salePrice: 1.5,
        stockQuantity: 200,
        hasBoxPresentation: true,
        unitsPerBox: 50,
        boxUnitName: 'Saco',
        boxSalePrice: 60,
        boxBarcode: `B${suffix}`,
        presentations: [
          {
            name: 'Paquete',
            factor: 20,
            salePrice: 25,
            barcode: `P${suffix}`,
            sunatUnit: 'PK',
          },
          { name: 'Kilo', factor: 4, salePrice: 5.5, sunatUnit: 'KGM' },
        ],
      })
      .expect(201);
    productId = created.body.id;

    const { body } = await http()
      .get(`/api/v1/products/barcode/U${suffix}`)
      .set(auth)
      .expect(200);
    paquete = body.presentations.find(
      (p: { name: string }) => p.name === 'Paquete',
    ).id;
    kilo = body.presentations.find(
      (p: { name: string }) => p.name === 'Kilo',
    ).id;
  }, 60_000);

  afterAll(() => app?.close());

  it('devuelve las presentaciones en el listado', async () => {
    const { body } = await http()
      .get('/api/v1/products')
      .query({ search: `Fideos ${suffix}` })
      .set(auth)
      .expect(200);
    expect(body.total).toBe(1);
    expect(body.data[0].presentations).toHaveLength(2);
  });

  it.each([
    ['unidad', 'U', 'U'],
    ['empaque', 'B', 'B'],
  ])(
    'identifica el código de barras de %s',
    async (_label, prefix, expected) => {
      const { body } = await http()
        .get(`/api/v1/products/barcode/${prefix}${suffix}`)
        .set(auth)
        .expect(200);
      expect(body.matchedOption).toBe(expected);
    },
  );

  it('identifica el código de barras de una presentación', async () => {
    const { body } = await http()
      .get(`/api/v1/products/barcode/P${suffix}`)
      .set(auth)
      .expect(200);
    expect(body.matchedOption).toBe(`P${paquete}`);
  });

  it('rechaza un código de barras que usa otro producto', async () => {
    await http()
      .post('/api/v1/products')
      .set(auth)
      .send({
        name: `Otro ${suffix}`,
        costPrice: 1,
        salePrice: 1,
        boxBarcode: `P${suffix}`,
      })
      .expect(409);
  });

  it('vende las cuatro presentaciones de un solo stock y guarda lo descontado', async () => {
    const { body } = await sell([
      { sellUnit: 'unit', quantity: 3, unitPrice: 1.5 },
      { sellUnit: 'box', boxes: 1, boxUnitPrice: 60 },
      { presentationId: paquete, quantity: 2, unitPrice: 25 },
      { presentationId: kilo, quantity: 1.5, unitPrice: 5.5 },
    ]).expect(201);

    expect(Number(body.totalAmount)).toBeCloseTo(4.5 + 60 + 50 + 8.25);
    const line = (name: string) =>
      body.items.find((i: { productName: string }) =>
        i.productName.endsWith(name),
      );
    expect(Number(line('(Paquete)').unitsDeducted)).toBe(40);
    expect(line('(Paquete)').sunatUnit).toBe('PK');
    expect(Number(line('(Kilo)').unitsDeducted)).toBe(6);
    expect(Number(line('(Saco)').unitsDeducted)).toBe(50);
    expect(await stock()).toBe(200 - 3 - 50 - 40 - 6);

    await voidSale(body.id).expect(200);
    expect(await stock()).toBe(200);
  });

  it('al anular una venta por empaque devuelve las unidades reales', async () => {
    const { body } = await sell([{ sellUnit: 'box', boxes: 2 }]).expect(201);
    expect(await stock()).toBe(100);

    await voidSale(body.id).expect(200);
    expect(await stock()).toBe(200);
  });

  it('usa el precio de la presentación si no llega uno', async () => {
    const { body } = await sell([
      { presentationId: paquete, quantity: 1 },
    ]).expect(201);
    expect(Number(body.totalAmount)).toBe(25);
    await voidSale(body.id).expect(200);
  });

  it('no vende más que el stock combinado', async () => {
    await sell([
      { presentationId: paquete, quantity: 9 },
      { sellUnit: 'unit', quantity: 21 },
    ]).expect(400);
    expect(await stock()).toBe(200);
  });

  it('rechaza una presentación de otro producto', async () => {
    await sell([{ presentationId: 999999, quantity: 1 }]).expect(400);
  });

  it('edita, agrega y quita presentaciones sin tocar el stock', async () => {
    await http()
      .put(`/api/v1/products/${productId}`)
      .set(auth)
      .send({
        presentations: [
          {
            id: paquete,
            name: 'Paquete',
            factor: 20,
            salePrice: 26,
            sunatUnit: 'PK',
          },
          { name: 'Docena', factor: 12, salePrice: 16, sunatUnit: 'DZN' },
        ],
      })
      .expect(200);

    const { body } = await http()
      .get(`/api/v1/products/barcode/U${suffix}`)
      .set(auth)
      .expect(200);
    const names = body.presentations
      .map((p: { name: string }) => p.name)
      .sort();
    expect(names).toEqual(['Docena', 'Paquete']);
    expect(
      Number(
        body.presentations.find((p: { id: number }) => p.id === paquete)
          .salePrice,
      ),
    ).toBe(26);
    expect(await stock()).toBe(200);
  });

  it('rechaza nombres repetidos en un producto', async () => {
    await http()
      .put(`/api/v1/products/${productId}`)
      .set(auth)
      .send({
        presentations: [
          { name: 'Kilo', factor: 4, salePrice: 5 },
          { name: 'kilo', factor: 4, salePrice: 5 },
        ],
      })
      .expect(400);
  });

  it('un producto sin presentaciones sigue vendiendo como antes', async () => {
    const created = await http()
      .post('/api/v1/products')
      .set(auth)
      .send({
        name: `Simple ${suffix}`,
        costPrice: 1,
        salePrice: 2,
        stockQuantity: 5,
      })
      .expect(201);
    const { body } = await http()
      .post('/api/v1/sales')
      .set(auth)
      .send({
        documentType: 'nota_venta',
        paymentMethod: 'cash',
        items: [{ productId: created.body.id, quantity: 2 }],
      })
      .expect(201);
    expect(Number(body.totalAmount)).toBe(4);
  });
});
