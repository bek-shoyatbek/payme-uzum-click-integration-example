import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client"
import { PrismaService } from "src/prisma.service";

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async executeTransaction<T>(callback: (prisma: PrismaClient) => Promise<T>) {
    try {
      return this.prisma.$transaction(callback);
    } catch (error) {
      console.error(error);
    }
  }
}