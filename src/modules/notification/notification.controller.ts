import { Body, Controller, Post, Get, UsePipes, ValidationPipe, BadRequestException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Notification } from './entity/notification.entity';
import { NotificationPush } from './entity/notificationPush.entity';
import { NotificationWhatsapp } from './entity/notificationWhatsapp.entity';
import { NotificationTelegram } from './entity/notificationTelegram.entity';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationDto } from './dto/notificationDto.dto';
import { SubscribeToDeviceTopicDto } from './dto/subscribtotopic.dto';
import { TopicNotification } from './dto/topicnotification .dto';

@Controller('notification')
@ApiTags('Email-Send')
export class NotificationController {
  constructor(
    private notificationService: NotificationService,
  ) { }


  @Post('send')
  @ApiOkResponse({ description: 'send notification suceesfully' })
  @ApiInternalServerErrorResponse({ description: "internal server error" })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiInternalServerErrorResponse({ description: 'Server Error' })
  @ApiBadRequestResponse({ description: 'Invalid Request' })
  @ApiBody({ type: NotificationDto })
  async sendNotification(
    @Body() notificationDto: NotificationDto
  ) {
    if (!notificationDto.email && !notificationDto.push && !notificationDto.sms) {
      throw new BadRequestException('At least one of email, push, or sms is required.');
    }
    return this.notificationService.sendNotification(notificationDto);
  }

  @Post('subscribetotopic')
  @ApiInternalServerErrorResponse({ description: 'Server Error' })
  @ApiBadRequestResponse({ description: 'Invalid Request' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiCreatedResponse({ description: 'Sunscribed the topic' })
  @ApiBody({ type: SubscribeToDeviceTopicDto })
  async subscribeToDeviceTopic(@Body() requestBody: SubscribeToDeviceTopicDto) {
    return await this.notificationService.subscribeToDeviceTopicFromDB(requestBody);
  }

  @Post('unsubscribetotopic')
  @ApiInternalServerErrorResponse({ description: 'Server Error' })
  @ApiBadRequestResponse({ description: 'Invalid Request' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiCreatedResponse({ description: 'Sunscribed the topic' })
  @ApiBody({ type: SubscribeToDeviceTopicDto })
  async subscribeToDeviceTopicFromDB(@Body() requestBody: SubscribeToDeviceTopicDto) {
    return await this.notificationService.unsubscribeFromTopic(requestBody);
  }


  @Post('sendTopicNotification')
  @ApiInternalServerErrorResponse({ description: 'Server Error' })
  @ApiBadRequestResponse({ description: 'Invalid Request' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiCreatedResponse({ description: 'Sunscribed the topic' })
  @ApiBody({ type: TopicNotification })
  async sendTopicNotification(@Body() requestBody: TopicNotification) {
    return await this.notificationService.sendTopicNotification(requestBody);
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

  // @Get()
  // index(): Promise<Notification[]> {
  //   return this.notificationService.findAll();
  // }

  // @Post('sendPush')
  // async sendPush(@Body() notificationData: NotificationPush): Promise<any> {
  //   return this.notificationService.sendPush(notificationData);
  // }

  // @Post('sendMessage')
  // async sendWhatsappMessage(@Body() notificationData: NotificationWhatsapp) {
  //   return this.notificationService.sendWhatsappMessage(notificationData);
  // }

  // @Post('sendTelegramMessage')
  // async sendTelegramMessage(@Body() notificationData: NotificationTelegram) {
  //   return this.notificationService.sendTelegramMessage(notificationData);
  // }
}
