import { TransactionMethods } from '../constants/transaction-methods';

export class CheckPerformTransactionDto {
  method: TransactionMethods;
  params: {
    amount: number;
    account: {
      planId: string;
      user_id: string;
    };
  };
}
