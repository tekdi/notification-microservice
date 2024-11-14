import { BadRequestException, Controller, Delete, Param, ParseUUIDPipe, Patch, Query, Res, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { NotificationEventsService } from './notification_events.service';
import { Post, Body } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SearchFilterDto } from './dto/searchTemplateType.dto';
import { Response } from 'express';
import { CreateEventDto } from './dto/createTemplate.dto';
import { UpdateEventDto } from './dto/updateEventTemplate.dto';
import { AllExceptionsFilter } from 'src/common/filters/exception.filter';
import { APIID } from 'src/common/utils/api-id.config';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/common/utils/constant.util';

@Controller('notification-templates')
@ApiTags('Notification-Templates')
export class NotificationEventsController {
  constructor(private notificationeventsService: NotificationEventsService) { }

  @UseFilters(new AllExceptionsFilter(APIID.TEMPLATE_CREATE))
  @Post()
  @ApiCreatedResponse({ description: SUCCESS_MESSAGES.TEMPLATE_CREATE })
  @ApiInternalServerErrorResponse({ description: ERROR_MESSAGES.INTERNAL_SERVER_ERROR })
  @ApiBadRequestResponse({ description: ERROR_MESSAGES.INVALID_REQUEST })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBody({ type: CreateEventDto })
  @ApiQuery({ name: 'userId', required: true, description: ERROR_MESSAGES.USERID_REQUIRED })
  async create(
    @Body() createEventDto: CreateEventDto,
    @Res() response: Response,
    @Query('userId', new ParseUUIDPipe({ exceptionFactory: () => new BadRequestException(ERROR_MESSAGES.USERID_UUID) })) userId: string
  ) {
    return this.notificationeventsService.createTemplate(userId, createEventDto, response);
  }

  @UseFilters(new AllExceptionsFilter(APIID.TEMPLATE_LIST))
  @Post('/list')
  @ApiBody({ type: SearchFilterDto })
  @ApiInternalServerErrorResponse({ description: ERROR_MESSAGES.INTERNAL_SERVER_ERROR })
  @ApiBadRequestResponse({ description: ERROR_MESSAGES.INVALID_REQUEST })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOkResponse({ description: SUCCESS_MESSAGES.TEMPLATE_LIST })
  async getTemplates(@Body() searchFilterDto: SearchFilterDto, @Res() response: Response, @Query('userId') userId: string | null) {
    return this.notificationeventsService.getTemplates(searchFilterDto, userId, response)
  }

  @UseFilters(new AllExceptionsFilter(APIID.TEMPLATE_GET))
  @Patch("/:id")
  @ApiBody({ type: UpdateEventDto })
  @ApiResponse({ status: 200, description: SUCCESS_MESSAGES.UPDATE_TEMPLATE_API })
  @ApiResponse({ status: 400, description: ERROR_MESSAGES.BAD_REQUEST })
  @ApiQuery({ name: 'userId', required: true, description: ERROR_MESSAGES.USERID_REQUIRED })
  @UsePipes(new ValidationPipe({ transform: true }))
  updateEvent(
    @Param("id") id: number,
    @Body() updateEventDto: UpdateEventDto,
    @Res() response: Response,
    @Query('userId', new ParseUUIDPipe({ exceptionFactory: () => new BadRequestException(ERROR_MESSAGES.USERID_REQUIRED) })) userId: string
  ) {
    return this.notificationeventsService.updateNotificationTemplate(
      id,
      updateEventDto,
      userId,
      response
    );
  }


  @UseFilters(new AllExceptionsFilter(APIID.TEMPLATE_DELETE))
  @Delete('/:id')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiResponse({ status: 200, description: SUCCESS_MESSAGES.TEMPLATE_DELETE })
  @ApiResponse({ status: 404, description: ERROR_MESSAGES.TEMPLATE_NOTFOUND })
  deleteTemplate(@Param('id') id: number, @Res() response: Response, @Query('userId') userId: string) {
    return this.notificationeventsService.deleteTemplate(id, userId, response)
  }
}
