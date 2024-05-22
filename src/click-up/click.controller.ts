import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ClickService } from './click.service';
import { ClickRequestDto } from './dto/click-request.dto';

@Controller('click')
export class ClickController {
  constructor(private readonly clickService: ClickService) {}
  @Post('shop-api')
  @HttpCode(HttpStatus.OK)
  async handleMerchantTransactions(@Body() clickReqBody: ClickRequestDto) {
    return await this.clickService.handleMerchantTransactions(clickReqBody);
  }
}
