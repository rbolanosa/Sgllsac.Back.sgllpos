export declare enum ModTraslado {
    PUBLICO = "01",
    PRIVADO = "02"
}
export declare enum CodTraslado {
    VENTA = "01",
    COMPRA = "02",
    TRASLADO_ALMACEN_PROPIO = "03",
    ENTRE_ESTABLECIMIENTOS = "04",
    IMPORTACION = "08",
    EXPORTACION = "09",
    OTROS = "13"
}
export declare class GuiaRemisionEntity {
    id: number;
    serie: string;
    correlativo: string | null;
    numeroCompleto: string | null;
    fechaEmision: string;
    fechaTraslado: string;
    destTipoDoc: string;
    destNumDoc: string;
    destRazonSocial: string;
    codTraslado: string;
    modTraslado: string;
    pesoTotal: number;
    undPesoTotal: string;
    numBultos: number | null;
    partidaUbigeo: string;
    partidaDireccion: string;
    llegadaUbigeo: string;
    llegadaDireccion: string;
    transportistaJson: string | null;
    fechaEntregaTransportista: string | null;
    vehiculoJson: string | null;
    conductorJson: string | null;
    itemsJson: string;
    sunatStatus: string;
    sunatMessage: string | null;
    xmlUrl: string | null;
    pdfUrl: string | null;
    cdrUrl: string | null;
    apisunatId: number | null;
    createdAt: Date;
    updatedAt: Date;
}
