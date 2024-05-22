import { Injectable } from '@nestjs/common';
import { ClickRequestDto } from './dto/click-request.dto';
import { TransactionActions } from './constants/transaction-actions';
import { ObjectId } from 'mongodb';
import { PrismaService } from 'src/prisma.service';
import { HashingService } from 'src/utils/hashing/hashing.service';
import { ConfigService } from '@nestjs/config';
import { ClickError } from 'src/enums/Payment.enum';

@Injectable()
export class ClickService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
    private readonly configService: ConfigService,
  ) {}

  async handleMerchantTransactions(clickReqBody: ClickRequestDto) {
    const actionType = +clickReqBody.action;
    clickReqBody.amount = parseFloat(clickReqBody.amount + '');

    if (isNaN(actionType)) {
      return {
        error: ClickError.ActionNotFound,
        error_note: 'Invalid action',
      };
    }

    if (actionType == TransactionActions.Prepare) {
      return this.prepare(clickReqBody);
    } else if (actionType == TransactionActions.Complete) {
      return this.complete(clickReqBody);
    } else {
      return {
        error: ClickError.ActionNotFound,
        error_note: 'Invalid action',
      };
    }
  }

  async prepare(clickReqBody: ClickRequestDto) {
    const secretKey = this.configService.get<string>('CLICK_SECRET');

    const planId = clickReqBody.merchant_trans_id;
    const userId = clickReqBody.param2;
    const amount = clickReqBody.amount;
    const transId = clickReqBody.click_trans_id + ''; // ! in db transId is string

    const md5Hash = this.hashingService.md5(
      `${clickReqBody.click_trans_id}${clickReqBody.service_id}${secretKey}${planId}${clickReqBody.amount}${clickReqBody.action}${clickReqBody.sign_time}`,
    );
    const isValidSignature = this.verifyMd5Hash(
      clickReqBody.sign_string,
      md5Hash,
    );

    if (!isValidSignature) {
      return {
        error: ClickError.SignFailed,
        error_note: 'Invalid sign_string',
      };
    }

    const isValidPlanId = this.checkObjectId(planId);

    const isValidUserId = this.checkObjectId(userId);

    if (!isValidPlanId || !isValidUserId) {
      return {
        error: ClickError.BadRequest,
        error_note: 'Invalid planId or userId',
      };
    }

    const isAlreadyPaid = await this.prismaService.transactions.findFirst({
      where: {
        userId: userId,
        planId: planId,
        status: 'PAID',
      },
    });

    if (isAlreadyPaid) {
      return {
        error: ClickError.AlreadyPaid,
        error_note: 'Already paid',
      };
    }

    const isCancelled = await this.prismaService.transactions.findFirst({
      where: {
        userId: userId,
        planId: planId,
        status: 'CANCELED',
      },
    });

    if (isCancelled) {
      return {
        error: ClickError.TransactionCanceled,
        error_note: 'Cancelled',
      };
    }

    const user = await this.prismaService.users.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return {
        error: ClickError.UserNotFound,
        error_note: 'Invalid userId',
      };
    }

    const plan = await this.prismaService.plans.findUnique({
      where: {
        id: planId,
      },
    });

    if (!plan) {
      return {
        error: ClickError.BadRequest,
        error_note: 'Product not found',
      };
    }

    if (parseInt(`${amount}`) !== plan.price) {
      console.error('Invalid amount');
      return {
        error: ClickError.InvalidAmount,
        error_note: 'Invalid amount',
      };
    }

    const transaction = await this.prismaService.transactions.findUnique({
      where: {
        transId: transId,
      },
    });

    if (transaction && transaction.status == 'CANCELED') {
      return {
        error: ClickError.TransactionCanceled,
        error_note: 'Transaction canceled',
      };
    }

    const time = new Date().getTime();

    await this.prismaService.transactions.create({
      data: {
        plan: {
          connect: {
            id: plan.id,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
        transId: transId,
        prepareId: time,
        status: 'PENDING',
        provider: 'click',
        amount: clickReqBody.amount,
        createdAt: new Date(time),
      },
    });

    return {
      click_trans_id: +transId,
      merchant_trans_id: planId,
      merchant_prepare_id: time,
      error: ClickError.Success,
      error_note: 'Success',
    };
  }

  async complete(clickReqBody: ClickRequestDto) {
    const planId = clickReqBody.merchant_trans_id;
    const userId = clickReqBody.param2;
    const prepareId = clickReqBody.merchant_prepare_id;
    const transId = clickReqBody.click_trans_id;
    const serviceId = clickReqBody.service_id;
    const amount = clickReqBody.amount;
    const signTime = clickReqBody.sign_time;
    const error = clickReqBody.error;

    const secretKey = this.configService.get<string>('CLICK_SECRET');
    const md5Hash = this.hashingService.md5(
      `${transId}${serviceId}${secretKey}${planId}${prepareId}${amount}${clickReqBody.action}${signTime}`,
    );
    const isValidSignature = this.verifyMd5Hash(
      clickReqBody.sign_string,
      md5Hash,
    );

    if (!isValidSignature) {
      return {
        error: ClickError.SignFailed,
        error_note: 'Invalid sign_string',
      };
    }

    const isValidPlanId = this.checkObjectId(planId);

    const isValidUserId = this.checkObjectId(userId);

    if (!isValidPlanId || !isValidUserId) {
      return {
        error: ClickError.BadRequest,
        error_note: 'Invalid planId or userId',
      };
    }

    const user = await this.prismaService.users.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return {
        error: ClickError.UserNotFound,
        error_note: 'Invalid userId',
      };
    }

    const plan = await this.prismaService.plans.findUnique({
      where: {
        id: planId,
      },
    });

    if (!plan) {
      return {
        error: ClickError.BadRequest,
        error_note: 'Invalid planId',
      };
    }

    const isPrepared = await this.prismaService.transactions.findFirst({
      where: {
        prepareId: +prepareId,
        userId: userId,
        planId: planId,
      },
    });

    if (!isPrepared) {
      return {
        error: ClickError.TransactionNotFound,
        error_note: 'Invalid merchant_prepare_id',
      };
    }

    const isAlreadyPaid = await this.prismaService.transactions.findFirst({
      where: {
        planId,
        prepareId: +prepareId,
        status: 'PAID',
      },
    });

    if (isAlreadyPaid) {
      return {
        error: ClickError.AlreadyPaid,
        error_note: 'Already paid',
      };
    }

    if (parseInt(`${amount}`) !== plan.price) {
      return {
        error: ClickError.InvalidAmount,
        error_note: 'Invalid amount',
      };
    }

    const transaction = await this.prismaService.transactions.findUnique({
      where: {
        transId: `${transId}`,
      },
    });

    if (transaction && transaction.status == 'CANCELED') {
      return {
        error: ClickError.TransactionCanceled,
        error_note: 'Already cancelled',
      };
    }

    if (error > 0) {
      await this.prismaService.transactions.update({
        where: {
          id: transaction.id,
        },
        data: {
          status: 'CANCELED',
        },
      });
      return {
        error: error,
        error_note: 'Failed',
      };
    }

    // update payment status
    await this.prismaService.transactions.update({
      where: {
        id: transaction.id,
      },
      data: {
        status: 'PAID',
      },
    });

    // TODO: Implement perform transaction for your service here, e.g.: give permission to user to access service

    return {
      click_trans_id: +transId,
      merchant_trans_id: planId,
      error: ClickError.Success,
      error_note: 'Success',
    };
  }

  private checkObjectId(id: string) {
    return ObjectId.isValid(id);
  }

  private verifyMd5Hash(incomingSign: string, mySign: string) {
    return incomingSign == mySign;
  }
}
