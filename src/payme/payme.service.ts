import { Injectable } from '@nestjs/common';
import { TransactionMethods } from './constants/transaction-methods';
import { CheckPerformTransactionDto } from './dto/check-perform-transaction.dto';
import { PrismaService } from 'src/prisma.service';
import { RequestBody } from './types/incoming-request-body';
import { GetStatementDto } from './dto/get-statement.dto';
import { CancelTransactionDto } from './dto/cancel-transaction.dto';
import { PerformTransactionDto } from './dto/perform-transaction.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ErrorStatusCodes } from './constants/error-status-codes';
import { TransactionState } from './constants/transaction-state';
import { CheckTransactionDto } from './dto/check-transaction.dto';
import { PaymeError } from './constants/payme-error';
import { DateTime } from 'luxon';
import { CancelingReasons } from './constants/canceling-reasons';

@Injectable()
export class PaymeService {
  constructor(private readonly prismaService: PrismaService) {}

  async handleTransactionMethods(reqBody: RequestBody) {
    const method = reqBody.method;
    switch (method) {
      case TransactionMethods.CheckPerformTransaction:
        return await this.checkPerformTransaction(
          reqBody as CheckPerformTransactionDto,
        );

      case TransactionMethods.CreateTransaction:
        return await this.createTransaction(reqBody as CreateTransactionDto);

      case TransactionMethods.CheckTransaction:
        return await this.checkTransaction(
          reqBody as unknown as CheckTransactionDto,
        );

      case TransactionMethods.PerformTransaction:
        return await this.performTransaction(reqBody as PerformTransactionDto);

      case TransactionMethods.CancelTransaction:
        return await this.cancelTransaction(reqBody as CancelTransactionDto);

      case TransactionMethods.GetStatement:
        return await this.getStatement(reqBody as GetStatementDto);
      default:
        return 'Invalid transaction method';
    }
  }

  /**
   * If payment is possible, the CheckPerformTransaction method returns the result allow.
   * If payment is impossible, the method returns an error.
   *
   * @param {CheckPerformTransactionDto} checkPerformTransactionDto
   */
  async checkPerformTransaction(
    checkPerformTransactionDto: CheckPerformTransactionDto,
  ) {
    const planId = checkPerformTransactionDto.params?.account?.planId;

    const userId = checkPerformTransactionDto.params?.account?.user_id;

    const plan = await this.prismaService.plans.findUnique({
      where: {
        id: planId,
      },
    });

    const user = await this.prismaService.users.findUnique({
      where: {
        id: userId,
      },
    });

    if (!plan || !user) {
      return {
        error: {
          code: ErrorStatusCodes.TransactionNotAllowed,
          message: {
            uz: 'Sizda mahsulot/foydalanuvchi topilmadi',
            en: 'Product/user not found',
            ru: 'Товар/пользователь не найден',
          },
          data: null,
        },
      };
    }

    if (plan.price !== checkPerformTransactionDto.params.amount) {
      return {
        error: PaymeError.InvalidAmount,
      };
    }
    return {
      result: {
        allow: true,
      },
    };
  }
  /**
   * The CreateTransaction method returns a list of payment recipients.
   * When the payment originator is the recipient, the field receivers can be omitted or set to NULL.
   * If a transaction has already been created,
   * the merchant application performs basic verification of the transaction
   * and returns the verification result to Payme Business.
   *
   * @param {CreateTransactionDto} createTransactionDto
   */
  async createTransaction(createTransactionDto: CreateTransactionDto) {
    const planId = createTransactionDto.params?.account?.planId;
    const userId = createTransactionDto.params?.account?.user_id;
    const transId = createTransactionDto.params?.id;

    const plan = await this.prismaService.plans.findUnique({
      where: {
        id: planId,
      },
    });

    const user = await this.prismaService.users.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return {
        error: PaymeError.UserNotFound,
        id: transId,
      };
    }

    if (!plan) {
      return {
        error: PaymeError.ProductNotFound,
        id: transId,
      };
    }

    const transaction = await this.prismaService.transactions.findUnique({
      where: {
        transId,
      },
    });

    if (transaction) {
      if (transaction.status !== 'PENDING') {
        return {
          error: PaymeError.CantDoOperation,
          id: transId,
        };
      }

      if (this.checkTransactionExpiration(transaction.createdAt)) {
        await this.prismaService.transactions.update({
          where: {
            transId,
          },
          data: {
            status: 'CANCELED',
            cancelTime: new Date(),
            state: TransactionState.PendingCanceled,
            reason: CancelingReasons.CanceledDueToTimeout,
          },
        });

        return {
          error: {
            ...PaymeError.CantDoOperation,
            state: TransactionState.PendingCanceled,
            reason: CancelingReasons.CanceledDueToTimeout,
          },
          id: transId,
        };
      }

      return {
        result: {
          transaction: transaction.id,
          state: TransactionState.Pending,
          create_time: new Date(transaction.createdAt).getTime(),
        },
      };
    }

    const checkTransaction: CheckPerformTransactionDto = {
      method: TransactionMethods.CheckPerformTransaction,
      params: {
        amount: plan.price,
        account: {
          planId,
          user_id: userId,
        },
      },
    };

    const checkResult = await this.checkPerformTransaction(checkTransaction);

    if (checkResult.error) {
      return {
        error: checkResult.error,
        id: transId,
      };
    }

    const newTransaction = await this.prismaService.transactions.create({
      data: {
        transId: createTransactionDto.params.id,
        user: {
          connect: {
            id: createTransactionDto.params.account.user_id,
          },
        },
        plan: {
          connect: {
            id: createTransactionDto.params.account.planId,
          },
        },
        provider: 'payme',
        state: TransactionState.Pending,
        amount: createTransactionDto.params.amount,
      },
    });

    return {
      result: {
        transaction: newTransaction.id,
        state: TransactionState.Pending,
        create_time: new Date(newTransaction.createdAt).getTime(),
      },
    };
  }

  /**
   * The PerformTransaction method credits
   * funds to the merchant’s account and sets the order to “paid” status.
   *
   * @param {PerformTransactionDto} performTransactionDto
   */
  async performTransaction(performTransactionDto: PerformTransactionDto) {
    const transaction = await this.prismaService.transactions.findUnique({
      where: {
        transId: performTransactionDto.params.id,
      },
    });

    if (!transaction) {
      return {
        error: PaymeError.TransactionNotFound,
        id: performTransactionDto.params.id,
      };
    }

    if (transaction.status !== 'PENDING') {
      if (transaction.status !== 'PAID') {
        return {
          error: PaymeError.CantDoOperation,
          id: performTransactionDto.params.id,
        };
      }

      return {
        result: {
          state: transaction.state,
          transaction: transaction.id,
          perform_time: new Date(transaction.performTime).getTime(),
        },
      };
    }

    const expirationTime = this.checkTransactionExpiration(
      transaction.createdAt,
    );

    if (expirationTime) {
      await this.prismaService.transactions.update({
        where: {
          transId: performTransactionDto.params.id,
        },
        data: {
          status: 'CANCELED',
          cancelTime: new Date(),
          state: TransactionState.PendingCanceled,
          reason: CancelingReasons.CanceledDueToTimeout,
        },
      });
      return {
        error: {
          state: TransactionState.PendingCanceled,
          reason: CancelingReasons.CanceledDueToTimeout,
          ...PaymeError.CantDoOperation,
        },
        id: performTransactionDto.params.id,
      };
    }

    // TODO: Implement perform transaction for your service here

    const performTime = new Date();

    const updatedPayment = await this.prismaService.transactions.update({
      where: {
        transId: performTransactionDto.params.id,
      },
      data: {
        status: 'PAID',
        state: TransactionState.Paid,
        performTime,
      },
    });

    return {
      result: {
        transaction: updatedPayment.id,
        perform_time: performTime.getTime(),
        state: TransactionState.Paid,
      },
    };
  }

  /**
   * The CancelTransaction method cancels both a created and a completed transaction.
   *
   * @param {CancelTransactionDto} cancelTransactionDto
   */
  async cancelTransaction(cancelTransactionDto: CancelTransactionDto) {
    const transId = cancelTransactionDto.params.id;

    const transaction = await this.prismaService.transactions.findUnique({
      where: {
        transId,
      },
    });

    if (!transaction) {
      return {
        id: transId,
        error: PaymeError.TransactionNotFound,
      };
    }

    if (transaction.status === 'PENDING') {
      const cancelTransaction = await this.prismaService.transactions.update({
        where: {
          id: transaction.id,
        },
        data: {
          status: 'CANCELED',
          state: TransactionState.PendingCanceled,
          cancelTime: new Date(),
          reason: cancelTransactionDto.params.reason,
        },
      });

      return {
        result: {
          cancel_time: cancelTransaction.cancelTime.getTime(),
          transaction: cancelTransaction.id,
          state: TransactionState.PendingCanceled,
        },
      };
    }

    if (transaction.state !== TransactionState.Paid) {
      return {
        result: {
          state: transaction.state,
          transaction: transaction.id,
          cancel_time: transaction.cancelTime.getTime(),
        },
      };
    }

    // TODO: Implement cancel transaction for your service here, e.g set transaction state to CANCELED

    const updatedTransaction = await this.prismaService.transactions.update({
      where: {
        id: transaction.id,
      },
      data: {
        status: 'CANCELED',
        state: TransactionState.PaidCanceled,
        cancelTime: new Date(),
        reason: cancelTransactionDto.params.reason,
      },
    });

    return {
      result: {
        cancel_time: updatedTransaction.cancelTime.getTime(),
        transaction: updatedTransaction.id,
        state: TransactionState.PaidCanceled,
      },
    };
  }

  /**
   * @param {CheckTransactionDto} checkTransactionDto
   */
  async checkTransaction(checkTransactionDto: CheckTransactionDto) {
    const transaction = await this.prismaService.transactions.findUnique({
      where: {
        transId: checkTransactionDto.params.id,
      },
    });

    if (!transaction) {
      return {
        error: PaymeError.TransactionNotFound,
        id: checkTransactionDto.params.id,
      };
    }

    return {
      result: {
        create_time: transaction.createdAt.getTime(),
        perform_time: new Date(transaction.performTime).getTime(),
        cancel_time: new Date(transaction.cancelTime).getTime(),
        transaction: transaction.id,
        state: transaction.state,
        reason: transaction.reason,
      },
    };
  }

  /**
   * To return a list of transactions for a specified period,
   * the GetStatement method is used
   * @param {GetStatementDto} getStatementDto
   */
  async getStatement(getStatementDto: GetStatementDto) {
    const transactions = await this.prismaService.transactions.findMany({
      where: {
        createdAt: {
          gte: new Date(getStatementDto.params.from),
          lte: new Date(getStatementDto.params.to),
        },
        provider: 'payme', // ! Transaction only from Payme
      },
    });

    return {
      result: {
        transactions: transactions.map((transaction) => {
          return {
            id: transaction.transId,
            time: new Date(transaction.createdAt).getTime(),
            amount: transaction.amount,
            account: {
              user_id: transaction.userId,
              planId: transaction.planId,
            },
            create_time: new Date(transaction.createdAt).getTime(),
            perform_time: new Date(transaction.performTime).getTime(),
            cancel_time: new Date(transaction.cancelTime).getTime(),
            transaction: transaction.id,
            state: transaction.state,
            reason: transaction.reason || null,
          };
        }),
      },
    };
  }

  private checkTransactionExpiration(createdAt: Date) {
    const transactionCreatedAt = new Date(createdAt);
    const timeoutDuration = 720;
    const timeoutThreshold = DateTime.now()
      .minus({
        minutes: timeoutDuration,
      })
      .toJSDate();

    return transactionCreatedAt < timeoutThreshold;
  }
}
