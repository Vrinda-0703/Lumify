import {receiptService} from "./featureService";
export const extractReceiptDetails=(file)=>receiptService.extract(file);
