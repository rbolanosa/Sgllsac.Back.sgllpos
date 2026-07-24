import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySettingsEntity } from '../entities/company-settings.entity';
import { EstablishmentEntity } from '../entities/establishment.entity';
import { EstablishmentSeriesEntity } from '../entities/establishment-series.entity';
import { FacturacionAdapter } from '../../infrastructure/adapters/facturacion.adapter';

export interface CreateEstablishmentDto {
  nombre: string;
  cod_local: string;
  direccion: string;
  ubigeo: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  es_principal?: boolean;
  telefono?: string;
  email?: string;
}

export interface SeriesItemDto {
  tipo: string;
  serie: string;
  sucursal_id?: number | string;
  correlativo_inicial?: number;
}

export interface SaveSeriesBatchDto {
  sucursal_id?: number | string;
  series: SeriesItemDto[];
}

@Injectable()
export class EstablishmentsService {
  constructor(
    @InjectRepository(CompanySettingsEntity)
    private readonly settingsRepo: Repository<CompanySettingsEntity>,
    @InjectRepository(EstablishmentEntity)
    private readonly estRepo: Repository<EstablishmentEntity>,
    @InjectRepository(EstablishmentSeriesEntity)
    private readonly seriesRepo: Repository<EstablishmentSeriesEntity>,
    private readonly facturacionAdapter: FacturacionAdapter,
  ) {}

  /** List all sucursales/establecimientos from local DB and APISUNAT */
  async findAll(): Promise<any> {
    try {
      // Fetch from APISUNAT first
      const res = await this.facturacionAdapter.get<any>('/sucursales').catch(() => null);
      const apiList = Array.isArray(res?.datos) ? res.datos : Array.isArray(res) ? res : [];

      if (apiList.length > 0) {
        // Sync API list into local DB establishments table (linked to company_settings id 1)
        for (const item of apiList) {
          let est = await this.estRepo.findOne({ where: { codLocal: item.cod_local || item.codLocal } });
          if (!est) {
            est = this.estRepo.create({
              companySettingsId: 1,
              nombre: item.nombre,
              codLocal: item.cod_local || item.codLocal || '0000',
              direccion: item.direccion || '',
              ubigeo: item.ubigeo || '060101',
              telefono: item.telefono || null,
              email: item.email || null,
              esPrincipal: !!item.es_principal,
            });
            await this.estRepo.save(est);
          }
        }
      }

      // Return from local database with series relation
      const localEsts = await this.estRepo.find({
        where: { companySettingsId: 1, activo: true },
        relations: { series: true },
        order: { esPrincipal: 'DESC', codLocal: 'ASC' },
      });

      if (localEsts.length > 0) {
        return localEsts.map(e => ({
          id: e.id,
          nombre: e.nombre,
          cod_local: e.codLocal,
          direccion: e.direccion,
          ubigeo: e.ubigeo,
          departamento: e.departamento,
          provincia: e.provincia,
          distrito: e.distrito,
          telefono: e.telefono,
          email: e.email,
          es_principal: e.esPrincipal,
          activo: e.activo,
          series: e.series,
        }));
      }

      return apiList;
    } catch (err: any) {
      console.warn('Advertencia al listar sucursales:', err.message);
      return this.estRepo.find({ where: { companySettingsId: 1, activo: true }, relations: { series: true } });
    }
  }

  /** Create a new sucursal/establecimiento in DEVPRO local DB and APISUNAT */
  async create(dto: CreateEstablishmentDto): Promise<any> {
    if (!dto.nombre || !dto.cod_local || !dto.direccion || !dto.ubigeo) {
      throw new BadRequestException('Campos obligatorios: nombre, cod_local, direccion, ubigeo.');
    }

    const codLocalClean = dto.cod_local.trim().padStart(4, '0');

    // 1. Validation: cod_local uniqueness check
    const existing = await this.estRepo.findOne({
      where: { companySettingsId: 1, codLocal: codLocalClean, activo: true },
    });
    if (existing) {
      throw new BadRequestException(`El Código de Local '${codLocalClean}' ya se encuentra registrado por el establecimiento '${existing.nombre}'. Cada establecimiento debe tener un código de local único (ej: 0001, 0002).`);
    }

    // 2. Unset principal on other establishments if this is marked as principal
    if (dto.es_principal) {
      await this.estRepo.update({ companySettingsId: 1 }, { esPrincipal: false });
    }

    // 3. Save locally in establishments table (linked to company_settings_id = 1)
    const newEst = this.estRepo.create({
      companySettingsId: 1,
      nombre: dto.nombre.trim(),
      codLocal: codLocalClean,
      direccion: dto.direccion.trim(),
      ubigeo: dto.ubigeo.trim(),
      departamento: dto.departamento || null,
      provincia: dto.provincia || null,
      distrito: dto.distrito || null,
      telefono: dto.telefono || null,
      email: dto.email || null,
      esPrincipal: dto.es_principal ?? false,
      activo: true,
    });
    const savedLocal = await this.estRepo.save(newEst);

    // 2. Sync to APISUNAT POST /sucursales
    try {
      const apiRes = await this.facturacionAdapter.post<any>('/sucursales', {
        nombre: dto.nombre,
        cod_local: dto.cod_local,
        direccion: dto.direccion,
        ubigeo: dto.ubigeo,
        es_principal: dto.es_principal ?? false,
        telefono: dto.telefono || undefined,
        email: dto.email || undefined,
      });
      return { ...savedLocal, apiData: apiRes?.datos || apiRes };
    } catch (err: any) {
      const errMsg = err?.response?.data?.mensaje || err?.response?.data?.message || err.message;
      console.warn('Sucursal guardada localmente pero hubo advertencia APISUNAT:', errMsg);
      return savedLocal;
    }
  }

  /** Save / assign series batch to a sucursal in local DB and APISUNAT */
  async saveSeriesBatch(dto: SaveSeriesBatchDto): Promise<any> {
    if (!dto.series || !Array.isArray(dto.series) || dto.series.length === 0) {
      throw new BadRequestException('Se requiere una lista de series a registrar.');
    }

    const sucursalId = Number(dto.sucursal_id);

    // Validate series format rules according to SUNAT standards
    for (const item of dto.series) {
      if (!item.tipo || !item.serie) {
        throw new BadRequestException('Cada elemento de serie debe tener tipo y serie.');
      }

      const serieUpper = item.serie.trim().toUpperCase();
      const tipo = item.tipo.toLowerCase();

      if (tipo === 'factura' && !/^F[A-Z0-9]{3}$/.test(serieUpper)) {
        throw new BadRequestException(`Serie de Factura inválida: '${item.serie}'. Debe iniciar con F (Ej: F001).`);
      }
      if (tipo === 'boleta' && !/^B[A-Z0-9]{3}$/.test(serieUpper)) {
        throw new BadRequestException(`Serie de Boleta inválida: '${item.serie}'. Debe iniciar con B (Ej: B001).`);
      }
      if (tipo === 'guia_remision' && !/^T[A-Z0-9]{3}$/.test(serieUpper)) {
        throw new BadRequestException(`Serie de Guía Remisión inválida: '${item.serie}'. Debe iniciar con T (Ej: T001).`);
      }
      if (tipo === 'guia_transportista' && !/^V[A-Z0-9]{3}$/.test(serieUpper)) {
        throw new BadRequestException(`Serie de Guía Transportista inválida: '${item.serie}'. Debe iniciar con V (Ej: V001).`);
      }
      if (tipo === 'retencion' && !/^R[A-Z0-9]{3}$/.test(serieUpper)) {
        throw new BadRequestException(`Serie de Retención inválida: '${item.serie}'. Debe iniciar con R (Ej: R001).`);
      }
      if (tipo === 'percepcion' && !/^P[A-Z0-9]{3}$/.test(serieUpper)) {
        throw new BadRequestException(`Serie de Percepción inválida: '${item.serie}'. Debe iniciar con P (Ej: P001).`);
      }
    }

    // 1. Save / Upsert series into local establishment_series table
    for (const item of dto.series) {
      const serieUpper = item.serie.trim().toUpperCase();
      let existingSeries = await this.seriesRepo.findOne({
        where: [
          { establishmentId: sucursalId, tipo: item.tipo },
          { serie: serieUpper },
        ],
      });

      if (existingSeries) {
        existingSeries.establishmentId = sucursalId;
        existingSeries.tipo = item.tipo;
        existingSeries.serie = serieUpper;
        existingSeries.correlativoInicial = item.correlativo_inicial || 1;
        await this.seriesRepo.save(existingSeries);
      } else {
        const newSeries = this.seriesRepo.create({
          establishmentId: sucursalId,
          tipo: item.tipo,
          serie: serieUpper,
          correlativoInicial: item.correlativo_inicial || 1,
          correlativoActual: item.correlativo_inicial || 1,
        });
        await this.seriesRepo.save(newSeries);
      }
    }

    // 2. Sync series to APISUNAT POST /series using the expected { series: [...] } payload
    try {
      // Resolve APISUNAT sucursal ID
      let apiSucursalId = sucursalId;
      const sucsRes = await this.facturacionAdapter.get<any>('/sucursales').catch(() => null);
      const apiSucs = Array.isArray(sucsRes?.datos) ? sucsRes.datos : Array.isArray(sucsRes) ? sucsRes : [];

      const estLocal = await this.estRepo.findOne({ where: { id: sucursalId } });
      if (estLocal && apiSucs.length > 0) {
        const match = apiSucs.find((s: any) => s.cod_local === estLocal.codLocal || s.nombre === estLocal.nombre);
        if (match?.id) apiSucursalId = match.id;
      }

      const payload = {
        series: dto.series.map(s => ({
          tipo: s.tipo,
          serie: s.serie.trim().toUpperCase(),
          sucursal_id: apiSucursalId,
          correlativo_inicial: s.correlativo_inicial || 1,
        })),
      };

      const apiRes = await this.facturacionAdapter.post<any>('/series', payload);
      return {
        message: 'Series registradas y guardadas exitosamente tanto en DEVPRO como en APISUNAT.',
        total_series: dto.series.length,
        apiData: apiRes?.datos || apiRes,
      };
    } catch (err: any) {
      const errMsg = err?.response?.data?.mensaje || err.message;
      console.warn('Series guardadas localmente en DEVPRO, advertencia sync APISUNAT:', errMsg);
    }

    return {
      message: 'Series guardadas correctamente en la base de datos local.',
      total_series: dto.series.length,
    };
  }

  /** List series for a sucursal or all series from local DB / APISUNAT */
  async listSeries(sucursalId?: number): Promise<any> {
    if (sucursalId) {
      const localSeries = await this.seriesRepo.find({ where: { establishmentId: Number(sucursalId) } });
      if (localSeries.length > 0) return localSeries;
    }

    try {
      const endpoint = sucursalId ? `/series?sucursal_id=${sucursalId}` : '/series';
      const res = await this.facturacionAdapter.get<any>(endpoint);
      return res?.datos || res;
    } catch {
      return sucursalId ? this.seriesRepo.find({ where: { establishmentId: Number(sucursalId) } }) : this.seriesRepo.find();
    }
  }
}
