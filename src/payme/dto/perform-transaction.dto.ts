import { TransactionMethods } from '../constants/transaction-methods';

export class PerformTransactionDto {
  method: TransactionMethods;
  params: {
    id: string;
  };
}
