import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClickModule } from './click-up/click.module';
import { UzumModule } from './uzum/uzum.module';
import { PaymeModule } from './payme/payme.module';

@Module({
  imports: [ClickModule, UzumModule, PaymeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
