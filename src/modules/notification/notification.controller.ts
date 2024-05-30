import { Body, Controller, Post, Get } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Notification } from './entity/notification.entity';
import { NotificationPush } from './entity/notificationPush.entity';
import { NotificationWhatsapp } from './entity/notificationWhatsapp.entity';
import { NotificationTelegram } from './entity/notificationTelegram.entity';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { NotificationDto } from './dto/notificationDto.dto';

@Controller('notification')
@ApiTags('Email-Send')
export class NotificationController {
  constructor(
    private notificationService: NotificationService,
  ) { }


  @Post('send')
  @ApiOkResponse({ description: 'send notification suceesfully' })
  @ApiInternalServerErrorResponse({ description: "internal server error" })
  @ApiBody({ type: NotificationDto })
  async sendNotification(
    @Body() notificationDto: NotificationDto
  ) {
    return this.notificationService.sendNotification(notificationDto);
  }

  // @Post('send')
  // async send(@Body() notificationData: Notification): Promise<any> {
  //   console.log('here');
  //   return this.notificationService.send(notificationData);
  // }

  // @Post('send')
  // async send(@Body() notificationData: Notification): Promise<any> {
  //   console.log('here');
  //   return this.notificationService.sendEmail(notificationData);
  // }

  @Get()
  index(): Promise<Notification[]> {
    return this.notificationService.findAll();
  }

  @Post('sendPush')
  async sendPush(@Body() notificationData: NotificationPush): Promise<any> {
    return this.notificationService.sendPush(notificationData);
  }

  @Post('sendMessage')
  async sendWhatsappMessage(@Body() notificationData: NotificationWhatsapp) {
    return this.notificationService.sendWhatsappMessage(notificationData);
  }

  @Post('sendTelegramMessage')
  async sendTelegramMessage(@Body() notificationData: NotificationTelegram) {
    return this.notificationService.sendTelegramMessage(notificationData);
  }
}
