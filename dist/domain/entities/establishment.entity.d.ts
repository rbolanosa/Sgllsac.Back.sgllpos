import { CompanySettingsEntity } from './company-settings.entity';
import type { EstablishmentSeriesEntity } from './establishment-series.entity';
export declare class EstablishmentEntity {
    id: number;
    companySettingsId: number;
    companySettings: CompanySettingsEntity;
    nombre: string;
    codLocal: string;
    direccion: string;
    ubigeo: string;
    departamento: string;
    provincia: string;
    distrito: string;
    telefono: string;
    email: string;
    esPrincipal: boolean;
    activo: boolean;
    series: EstablishmentSeriesEntity[];
    createdAt: Date;
    updatedAt: Date;
}
