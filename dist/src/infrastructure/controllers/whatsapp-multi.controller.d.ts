import { WhatsappMultiService } from '../services/whatsapp-multi.service';
export declare class WhatsappMultiController {
    private readonly whatsappService;
    constructor(whatsappService: WhatsappMultiService);
    getStatus(): Promise<any>;
    getContacts(): Promise<{
        id: number;
        name: string;
        nit: string;
        phone: string;
        email: string;
        address: string;
        hasPhone: boolean;
    }[]>;
    sendText(body: {
        to: string;
        message: string;
    }): Promise<any>;
    sendVoucher(saleId: number, body: {
        phone?: string;
    }): Promise<{
        success: boolean;
        message: string;
        apiResponse: any;
    }>;
}
