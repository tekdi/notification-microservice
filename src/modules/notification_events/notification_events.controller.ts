import { Controller, Delete, Param, Patch, Res, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { NotificationEventsService } from './notification_events.service';
import { Post, Body } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBasicAuth, ApiBody, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SearchFilterDto } from './dto/searchTemplateType.dto';
import { Response } from 'express';
import { CreateEventDto } from './dto/createTemplate.dto';
import { UpdateEventDto } from './dto/updateEventTemplate.dto';
import { UpdateNotificationActionDto } from './dto/updateNotificationAction.dto';
import { AllExceptionsFilter } from 'src/common/filters/exception.filter';
import { APIID } from 'src/common/utils/api-id.config';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/common/utils/constant.util';
import { GetUserId } from 'src/common/decorator/userId.decorator';

@Controller('notification-templates')
@ApiTags('Notification-Templates')
@ApiBasicAuth('access-token')
export class NotificationEventsController {
  constructor(private notificationeventsService: NotificationEventsService) {}

  @UseFilters(new AllExceptionsFilter(APIID.TEMPLATE_CREATE))
  @Post()
  @ApiCreatedResponse({ description: SUCCESS_MESSAGES.TEMPLATE_CREATE })
  @ApiInternalServerErrorResponse({
    description: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
  })
  @ApiBadRequestResponse({ description: ERROR_MESSAGES.INVALID_REQUEST })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBody({ type: CreateEventDto })
  async create(
    @Body() createEventDto: CreateEventDto,
    @Res() response: Response,
    @GetUserId() userId: string,
  ) {
    return this.notificationeventsService.createTemplate(userId, createEventDto, response);
  }

  @UseFilters(new AllExceptionsFilter(APIID.TEMPLATE_LIST))
  @Post("/list")
  @ApiBody({ type: SearchFilterDto })
  @ApiInternalServerErrorResponse({
    description: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
  })
  @ApiBadRequestResponse({ description: ERROR_MESSAGES.INVALID_REQUEST })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOkResponse({ description: SUCCESS_MESSAGES.TEMPLATE_LIST })
  async getTemplates(
    @Body() searchFilterDto: SearchFilterDto, 
    @Res() response: Response, 
    @GetUserId() userId: string,
  ) {
    return this.notificationeventsService.getTemplates(searchFilterDto, userId, response)
  }

  @UseFilters(new AllExceptionsFilter(APIID.TEMPLATE_GET))
  @Patch("/:id")
  @ApiBody({ type: UpdateEventDto })
  @ApiResponse({
    status: 200,
    description: SUCCESS_MESSAGES.UPDATE_TEMPLATE_API,
  })
  @ApiResponse({ status: 400, description: ERROR_MESSAGES.BAD_REQUEST })
  @UsePipes(new ValidationPipe({ transform: true }))
  updateEvent(
    @Param("id") id: number,
    @Body() updateEventDto: UpdateEventDto,
    @Res() response: Response,
    @GetUserId() userId: string,

  ) {
    return this.notificationeventsService.updateNotificationTemplate(
      id,
      updateEventDto,
      userId,
      response
    );
  }

  @UseFilters(new AllExceptionsFilter(APIID.TEMPLATE_UPDATE))
  @Patch("/action/:id")
  @ApiBody({ type: UpdateNotificationActionDto })
  @ApiResponse({
    status: 200,
    description: "Notification action updated successfully",
  })
  @ApiResponse({ status: 400, description: ERROR_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 404, description: ERROR_MESSAGES.TEMPLATE_NOTFOUND })
  @UsePipes(new ValidationPipe({ transform: true }))
  updateNotificationAction(
    @Param("id") id: number,
    @Body() updateNotificationActionDto: UpdateNotificationActionDto,
    @Res() response: Response,
    @GetUserId() userId: string,
  ) {
    return this.notificationeventsService.updateNotificationAction(
      id,
      updateNotificationActionDto,
      userId,
      response
    );
  }

  @UseFilters(new AllExceptionsFilter(APIID.TEMPLATE_DELETE))
  @Delete("/:id")
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiResponse({ status: 200, description: SUCCESS_MESSAGES.TEMPLATE_DELETE })
  @ApiResponse({ status: 404, description: ERROR_MESSAGES.TEMPLATE_NOTFOUND })
  deleteTemplate(
    @Param('id') id: number, 
    @Res() response: Response, 
    @GetUserId() userId: string,
  ) {
    return this.notificationeventsService.deleteTemplate(id, userId, response)
  }
}
