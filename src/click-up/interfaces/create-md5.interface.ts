export interface CreateMd5Params {
  clickTransId: number;
  serviceId: number;
  secretKey: string;
  merchantTransId: string;
  merchantPrepareId: number;
  amount: number;
  action: number;
  signTime: string;
}
