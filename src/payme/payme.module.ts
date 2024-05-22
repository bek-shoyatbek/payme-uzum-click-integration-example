import { Module } from '@nestjs/common';
import { PaymeService } from './payme.service';
import { PaymeController } from './payme.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [PaymeController],
  providers: [PaymeService, PrismaService],
})
export class PaymeModule {}
