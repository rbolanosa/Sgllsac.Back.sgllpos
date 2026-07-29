export declare class DestinatarioDto {
    tipo_doc: string;
    num_doc: string;
    razon_social: string;
}
export declare class TransportistaDto {
    tipo_doc: string;
    num_doc: string;
    razon_social: string;
    nro_mtc?: string;
}
export declare class VehiculoSecundarioDto {
    placa: string;
}
export declare class VehiculoDto {
    placa: string;
    secundarios?: VehiculoSecundarioDto[];
}
export declare class ConductorDto {
    tipo?: string;
    tipo_doc: string;
    num_doc: string;
    nombres: string;
    apellidos: string;
    licencia: string;
}
export declare class GuiaRemisionItemDto {
    codigo: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
}
export declare class CreateGuiaRemisionDto {
    serie?: string;
    fecha_emision: string;
    destinatario: DestinatarioDto;
    cod_traslado: string;
    mod_traslado: string;
    fecha_traslado: string;
    fecha_de_entrega_al_transportista?: string;
    peso_total: number;
    und_peso_total?: string;
    num_bultos?: number;
    partida_ubigeo: string;
    partida_direccion: string;
    llegada_ubigeo: string;
    llegada_direccion: string;
    transportista?: TransportistaDto;
    vehiculo?: VehiculoDto;
    conductor?: ConductorDto;
    conductores?: ConductorDto[];
    indicadores?: string[];
    items: GuiaRemisionItemDto[];
    enviar_automatico?: boolean;
}
