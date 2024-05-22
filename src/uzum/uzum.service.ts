import { BadRequestException, Injectable } from '@nestjs/common';
import { CheckTransactionDto } from './dto/check-transaction.dto';
import { PrismaService } from 'src/prisma.service';
import { ErrorStatusCode } from './constants/error-status-codes';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ConfigService } from '@nestjs/config';
import { ResponseStatus } from './constants/response-status';
import { ConfirmTransactionDto } from './dto/confirm-transaction.dto';
import { ReverseTransactionDto } from './dto/reverse-transaction.dto';
import { CheckTransactionStatusDto } from './dto/check-status.dto';
import { ObjectId } from 'mongodb';
import { error } from 'console';

@Injectable()
export class UzumService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}
  async check(checkTransactionDto: CheckTransactionDto) {
    const serviceId = checkTransactionDto.serviceId;
    const planId = checkTransactionDto.params.planId;

    if (!this.checkServiceId(serviceId)) {
      error('Invalid service id');
      throw new BadRequestException({
        serviceId,
        timestamp: new Date().valueOf(),
        status: ResponseStatus.Failed,
        errorCode: ErrorStatusCode.ErrorCheckingPaymentData,
      });
    }

    if (!this.checkObjectId(planId)) {
      error('Invalid plan id');
      throw new BadRequestException({
        serviceId,
        timestamp: new Date().valueOf(),
        status: ResponseStatus.Failed,
        errorCode: ErrorStatusCode.ErrorCheckingPaymentData,
      });
    }

    const plan = await this.prismaService.plans.findUnique({
      where: {
        id: planId,
      },
    });

    if (!plan) {
      error('Plan not found');
      throw new BadRequestException({
        serviceId,
        timestamp: new Date().valueOf(),
        status: ResponseStatus.Failed,
        errorCode: ErrorStatusCode.ErrorCheckingPaymentData,
      });
    }

    return {
      serviceId,
      timestamp: new Date().valueOf(),
      status: ResponseStatus.Ok,
      data: {
        account: {
          value: checkTransactionDto.params.planId,
        },
      },
    };
  }

  async create(createTransactionDto: CreateTransactionDto) {
    const serviceId = createTransactionDto.serviceId;
    const planId = createTransactionDto.params.planId;
    const transId = createTransactionDto.transId;
    const userId = createTransactionDto.params.userId;

    if (!this.checkServiceId(serviceId)) {
      error('Invalid service id');
      throw new BadRequestException({
        serviceId,
        timestamp: new Date().valueOf(),
        status: ResponseStatus.Failed,
        errorCode: ErrorStatusCode.ErrorCheckingPaymentData,
      });
    }

    const transaction = await this.prismaService.transactions.findUnique({
      where: {
        transId,
      },
    });

    if (transaction) {
      error('Transaction already exists');
      throw new BadRequestException({
        serviceId,
        timestamp: new Date().valueOf(),
        status: ResponseStatus.Failed,
        errorCode: ErrorStatusCode.ErrorCheckingPaymentData,
      });
    }

    if (!this.checkObjectId(planId)) {
      error('Invalid account id');
      throw new BadRequestException({
        serviceId,
        timestamp: new Date().valueOf(),
        status: ResponseStatus.Failed,
        errorCode: ErrorStatusCode.ErrorCheckingPaymentData,
      });
    }

    const plan = await this.prismaService.plans.findUnique({
      where: {
        id: planId,
      },
    });

    if (!plan) {
      error('Invalid plan id');
      throw new BadRequestException({
        serviceId,
        timestamp: new Date().valueOf(),
        status: ResponseStatus.Failed,
        errorCode: ErrorStatusCode.ErrorCheckingPaymentData,
      });
    }

    const isValidAmount = plan.price === createTransactionDto.amount / 100; // ! incoming amount is in tiyn

    if (!isValidAmount) {
      error('Invalid amount');
      throw new BadRequestException({
        serviceId,
        timestamp: new Date().valueOf(),
        status: ResponseStatus.Failed,
        errorCode: ErrorStatusCode.ErrorCheckingPaymentData,
      });
    }

    const user = await this.prismaService.users.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      error('Invalid user id');
      throw new BadRequestException({
        serviceId,
        timestamp: new Date().valueOf(),
        status: ResponseStatus.Failed,
        errorCode: ErrorStatusCode.ErrorCheckingPaymentData,
      });
    }

    await this.prismaService.transactions.create({
      data: {
        transId,
        amount: createTransactionDto.amount,
        user: {
          connect: {
            id: userId,
          },
        },
        status: 'PENDING',
        provider: 'uzum',
        plan: {
          connect: {
            id: planId,
          },
        },
      },
    });

    return {
      serviceId,
      timestamp: new Date().valueOf(),
      status: ResponseStatus.Created,
      transTime: new Date().valueOf(),
      transId,
      amount: createTransactionDto.amount,
    };
  }

  async confirm(confirmTransactionDto: ConfirmTransactionDto) {
    const serviceId = confirmTransactionDto.serviceId;
    const transId = confirmTransactionDto.transId;

    if (!this.checkServiceId(serviceId)) {
      error('Invalid service id');
      throw new BadRequestException({
        serviceId,
        transId,
        status: ResponseStatus.Failed,
        confirmTime: new Date().valueOf(),
        errorCode: ErrorStatusCode.InvalidServiceId,
      });
    }

    const transaction = await this.prismaService.transactions.findUnique({
      where: {
        transId,
      },
    });

    if (!transaction) {
      error('Invalid transaction id');
      throw new BadRequestException({
        serviceId,
        transId,
        status: ResponseStatus.Failed,
        confirmTime: new Date().valueOf(),
        errorCode: ErrorStatusCode.AdditionalPaymentPropertyNotFound,
      });
    }

    if (transaction.status !== 'PENDING') {
      error('Payment already processed');
      throw new BadRequestException({
        serviceId,
        transId,
        status: ResponseStatus.Failed,
        confirmTime: new Date().valueOf(),
        errorCode: ErrorStatusCode.PaymentAlreadyProcessed,
      });
    }

    if (transaction.provider !== 'uzum') {
      error('Payment already processed');
      throw new BadRequestException({
        serviceId,
        transId,
        status: ResponseStatus.Failed,
        confirmTime: new Date().valueOf(),
        errorCode: ErrorStatusCode.PaymentAlreadyProcessed,
      });
    }

    // TODO: Implement your payment processing logic here

    await this.prismaService.transactions.update({
      where: {
        transId,
      },
      data: {
        performTime: new Date(),
        status: 'PAID',
      },
    });

    return {
      serviceId,
      transId,
      status: ResponseStatus.Confirmed,
      confirmTime: new Date().valueOf(),
    };
  }

  async reverse(reverseTransactionDto: ReverseTransactionDto) {
    const serviceId = reverseTransactionDto.serviceId;
    const transId = reverseTransactionDto.transId;

    if (!this.checkServiceId(serviceId)) {
      error('Invalid service id');
      throw new BadRequestException({
        serviceId,
        transId,
        status: ResponseStatus.Failed,
        reverseTime: new Date().valueOf(),
        errorCode: ErrorStatusCode.InvalidServiceId,
      });
    }

    const transaction = await this.prismaService.transactions.findUnique({
      where: {
        transId,
      },
    });

    if (!transaction) {
      error('Invalid transaction id');
      throw new BadRequestException({
        serviceId,
        transId,
        status: ResponseStatus.Failed,
        reverseTime: new Date().valueOf(),
        errorCode: ErrorStatusCode.AdditionalPaymentPropertyNotFound,
      });
    }

    await this.prismaService.transactions.update({
      where: {
        transId,
      },
      data: {
        cancelTime: new Date(),
        status: 'CANCELED',
      },
    });
    return {
      serviceId,
      transId,
      status: ResponseStatus.Reversed,
      reverseTime: new Date().valueOf(),
      amount: transaction.amount,
    };
  }

  async status(checkTransactionDto: CheckTransactionStatusDto) {
    const serviceId = checkTransactionDto.serviceId;
    const transId = checkTransactionDto.transId;

    if (!this.checkServiceId(serviceId)) {
      error('Invalid service id');
      throw new BadRequestException({
        serviceId,
        transId,
        status: ResponseStatus.Failed,
        errorCode: ErrorStatusCode.InvalidServiceId,
      });
    }

    const transaction = await this.prismaService.transactions.findUnique({
      where: {
        transId,
      },
    });

    if (!transaction) {
      error('Invalid transaction id');
      throw new BadRequestException({
        serviceId,
        transId,
        status: ResponseStatus.Failed,
        errorCode: ErrorStatusCode.AdditionalPaymentPropertyNotFound,
      });
    }

    return {
      serviceId,
      transId,
      status: transaction.status,
    };
  }

  private checkServiceId(serviceId: number) {
    const myServiceId = this.configService.get<number>('UZUM_SERVICE_ID');

    return serviceId === +myServiceId;
  }

  private checkObjectId(id: string) {
    return ObjectId.isValid(id);
  }
}
