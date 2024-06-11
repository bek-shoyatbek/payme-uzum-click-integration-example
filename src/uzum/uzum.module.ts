import { Module } from '@nestjs/common';
import { UzumService } from './uzum.service';
import { UzumController } from './uzum.controller';
import { PrismaService } from 'src/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/auth/auth.module';
import { TransactionService } from 'src/utils/service/transaction.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [UzumController],
  providers: [UzumService, PrismaService, TransactionService],
  exports: [TransactionService],
})
export class UzumModule {}
