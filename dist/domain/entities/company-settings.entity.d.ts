export declare enum TaxRegime {
    GENERAL = "general",
    MYPE = "mype_tributaria",
    ESPECIAL = "especial",
    NO_DOMICILIADO = "no_domiciliado"
}
export declare enum InvoiceType {
    FACTURA = "01",
    BOLETA = "03"
}
export declare class CompanySettingsEntity {
    id: number;
    ruc: string;
    razonSocial: string;
    nombreComercial: string | null;
    direccion: string;
    ubigeo: string | null;
    distrito: string | null;
    provincia: string | null;
    departamento: string | null;
    pais: string;
    regimenTributario: TaxRegime;
    usuarioSol: string | null;
    claveSol: string | null;
    serieFactura: string;
    serieBoleta: string;
    serieNotaVenta: string;
    correlativoFactura: number;
    correlativoBoleta: number;
    correlativoNotaVenta: number;
    igvRate: number;
    moneda: string;
    telefono: string | null;
    email: string | null;
    logoUrl: string | null;
    website: string | null;
    sunatApiUrl: string | null;
    productionMode: boolean;
    createdAt: Date;
    updatedAt: Date;
}
