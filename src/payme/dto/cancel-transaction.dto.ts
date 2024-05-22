import { TransactionMethods } from '../constants/transaction-methods';

export class CancelTransactionDto {
  method: TransactionMethods;
  params: {
    id: string;
    reason: number;
  };
}
