export class CreateTransactionDto {
  serviceId: number;
  timestamp: number;
  transId: string;
  params: {
    planId: string;
    userId: string;
    [key: string]: any;
  };
  amount: number;
}
