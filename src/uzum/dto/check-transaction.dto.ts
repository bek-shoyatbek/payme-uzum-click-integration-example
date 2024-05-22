export class CheckTransactionDto {
  serviceId: number;
  timestamp: number;
  params: {
    planId: string;
    [key: string]: any;
  };
}
