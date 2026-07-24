import type { EstablishmentEntity } from './establishment.entity';
export declare class EstablishmentSeriesEntity {
    id: number;
    establishmentId: number;
    establishment: EstablishmentEntity;
    tipo: string;
    serie: string;
    correlativoActual: number;
    correlativoInicial: number;
    activo: boolean;
    createdAt: Date;
    updatedAt: Date;
}
