import { CancelTransactionDto } from '../dto/cancel-transaction.dto';
import { CheckPerformTransactionDto } from '../dto/check-perform-transaction.dto';
import { CheckTransactionDto } from '../dto/check-transaction.dto';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { GetStatementDto } from '../dto/get-statement.dto';
import { PerformTransactionDto } from '../dto/perform-transaction.dto';

export type RequestBody =
  | CheckPerformTransactionDto
  | CreateTransactionDto
  | PerformTransactionDto
  | CancelTransactionDto
  | CheckTransactionDto
  | GetStatementDto;
