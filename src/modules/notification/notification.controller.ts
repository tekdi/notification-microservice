import { Body, Controller, Post, Get, UsePipes, ValidationPipe, BadRequestException, Res, UseFilters } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationDto } from './dto/notificationDto.dto';
import { SubscribeToDeviceTopicDto } from './dto/subscribtotopic.dto';
import { TopicNotification } from './dto/topicnotification .dto';
import { Response, response } from 'express';
import { AllExceptionsFilter } from 'src/common/filters/exception.filter';
import { APIID } from 'src/common/utils/api-id.config';

@Controller('notification')
@ApiTags('Notification-send')
export class NotificationController {
  constructor(
    private notificationService: NotificationService,
  ) { }


  @UseFilters(new AllExceptionsFilter(APIID.SEND_NOTIFICATION))
  @Post('send')
  @ApiOkResponse({ description: 'send notification successfully' })
  @ApiInternalServerErrorResponse({ description: "internal server error" })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiInternalServerErrorResponse({ description: 'Server Error' })
  @ApiBadRequestResponse({ description: 'Invalid Request' })
  @ApiBody({ type: NotificationDto })
  async sendNotification(
    @Body() notificationDto: NotificationDto, @Res() response: Response
  ) {
    if (!notificationDto.email && !notificationDto.push && !notificationDto.sms) {
      throw new BadRequestException('At least one of email, push, or sms is required.');
    }
    return this.notificationService.sendNotification(notificationDto, response);
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

  // @Post('sendMessage')
  // async sendWhatsappMessage(@Body() notificationData: NotificationWhatsapp) {
  //   return this.notificationService.sendWhatsappMessage(notificationData);
  // }

  // @Post('sendTelegramMessage')
  // async sendTelegramMessage(@Body() notificationData: NotificationTelegram) {
  //   return this.notificationService.sendTelegramMessage(notificationData);
  // }
}
