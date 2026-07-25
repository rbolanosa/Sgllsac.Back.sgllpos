import { EstablishmentsService, CreateEstablishmentDto, SaveSeriesBatchDto } from '../../domain/services/establishments.service';
export declare class EstablishmentsController {
    private readonly service;
    constructor(service: EstablishmentsService);
    findAll(): Promise<any>;
    create(dto: CreateEstablishmentDto): Promise<any>;
    listSeries(sucursalId?: string): Promise<any>;
    saveSeriesBatch(dto: SaveSeriesBatchDto): Promise<any>;
}
