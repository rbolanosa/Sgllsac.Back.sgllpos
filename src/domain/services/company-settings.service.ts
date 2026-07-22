import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySettingsEntity } from '../entities/company-settings.entity';
import { UpdateCompanySettingsDto } from '../../application/dto/company-settings.dto';

const SINGLETON_ID = 1;

@Injectable()
export class CompanySettingsService {
  constructor(
    @InjectRepository(CompanySettingsEntity)
    private readonly repo: Repository<CompanySettingsEntity>,
  ) {}

  /** Returns the single company settings record (creates default if not exists). */
  async get(): Promise<CompanySettingsEntity> {
    let settings = await this.repo.findOne({ where: { id: SINGLETON_ID } });
    if (!settings) {
      settings = this.repo.create({ id: SINGLETON_ID });
      await this.repo.save(settings);
    }
    return settings;
  }

  /** Upsert — always writes to id=1. */
  async update(dto: UpdateCompanySettingsDto): Promise<CompanySettingsEntity> {
    // Ensure record exists
    await this.get();

    await this.repo.update(SINGLETON_ID, {
      ...dto,
    });

    return this.get();
  }

  /** Returns the next invoice number for a given series and increments its independent correlativo. */
  async nextInvoiceNumber(type: 'factura' | 'boleta' | 'nota_venta', manager?: any): Promise<string> {
    const mgr = manager || this.repo;
    const settings = manager
      ? await manager.findOne(CompanySettingsEntity, { where: { id: SINGLETON_ID } })
      : await this.get();

    let serie = settings?.serieBoleta || 'B001';
    let correlativo = settings?.correlativoBoleta || 1;
    let fieldToIncrement = 'correlativo_boleta';

    if (type === 'factura') {
      serie = settings?.serieFactura || 'F001';
      correlativo = settings?.correlativoFactura || 1;
      fieldToIncrement = 'correlativo_factura';
    } else if (type === 'nota_venta') {
      serie = settings?.serieNotaVenta || 'NV01';
      correlativo = settings?.correlativoNotaVenta || 1;
      fieldToIncrement = 'correlativo_nota_venta';
    }

    const invoiceNumber = `${serie}-${String(correlativo).padStart(8, '0')}`;

    // Increment document-specific correlativo in database
    if (manager) {
      await manager.query(
        `UPDATE company_settings SET ${fieldToIncrement} = ${fieldToIncrement} + 1 WHERE id = ?`,
        [SINGLETON_ID],
      );
    } else {
      await this.repo.increment({ id: SINGLETON_ID }, fieldToIncrement === 'correlativo_boleta' ? 'correlativoBoleta' : fieldToIncrement === 'correlativo_factura' ? 'correlativoFactura' : 'correlativoNotaVenta', 1);
    }

    return invoiceNumber;
  }
}
