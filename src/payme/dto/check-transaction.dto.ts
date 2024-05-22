import { TransactionMethods } from '../constants/transaction-methods';

export class CheckTransactionDto {
  method: TransactionMethods;
  params: {
    id: string;
  };
}
