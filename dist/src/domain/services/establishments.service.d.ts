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
export declare class EstablishmentsService {
    private readonly settingsRepo;
    private readonly estRepo;
    private readonly seriesRepo;
    private readonly facturacionAdapter;
    constructor(settingsRepo: Repository<CompanySettingsEntity>, estRepo: Repository<EstablishmentEntity>, seriesRepo: Repository<EstablishmentSeriesEntity>, facturacionAdapter: FacturacionAdapter);
    findAll(): Promise<any>;
    create(dto: CreateEstablishmentDto): Promise<any>;
    saveSeriesBatch(dto: SaveSeriesBatchDto): Promise<any>;
    listSeries(sucursalId?: number): Promise<any>;
}
