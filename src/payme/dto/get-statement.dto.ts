import { TransactionMethods } from '../constants/transaction-methods';


export class GetStatementDto {
  method: TransactionMethods;
  params: {
    from: number;
    to: number;
  };
}
