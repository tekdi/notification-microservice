import { Controller, Delete, Param, ParseUUIDPipe, Patch, Res, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { NotificationEventsService } from './notification_events.service';
import { Post, Body } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SearchFilterDto } from './dto/searchTemplateType.dto';
import { Response } from 'express';
import { CreateEventDto } from './dto/createTemplate.dto';
import { UpdateEventDto } from './dto/updateEventTemplate.dto';
import { AllExceptionsFilter } from 'src/common/filters/exception.filter';
import { APIID } from 'src/common/utils/api-id.config';

@Controller('notification-events')
@ApiTags('Event-type')
export class NotificationEventsController {
  constructor(private notificationeventsService: NotificationEventsService) { }

  @UseFilters(new AllExceptionsFilter(APIID.TEMPLATE_CREATE))
  @Post()
  @ApiCreatedResponse({ description: "created" })
  @ApiInternalServerErrorResponse({ description: "internal server error" })
  @ApiBadRequestResponse({ description: "Invalid request" })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBody({ type: CreateEventDto })
  async create(@Body() createEventDto: CreateEventDto, @Res() response: Response) {
    const userId = '016badad-22b0-4566-88e9-aab1b35b1dfc';
    return this.notificationeventsService.createTemplate(userId, createEventDto, response)
  }

  @UseFilters(new AllExceptionsFilter(APIID.TEMPLATE_LIST))
  @Post('/list')
  @ApiBody({ type: SearchFilterDto })
  @ApiInternalServerErrorResponse({ description: 'Server Error' })
  @ApiBadRequestResponse({ description: 'Invalid Request' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOkResponse({ description: 'Get Template List' })
  async getTemplates(@Body() searchFilterDto: SearchFilterDto, @Res() response: Response) {
    return this.notificationeventsService.getTemplatesTypesForEvent(searchFilterDto, response)
  }

  @UseFilters(new AllExceptionsFilter(APIID.TEMPLATE_GET))
  @Patch("/:id")
  @ApiBody({ type: UpdateEventDto })
  @ApiResponse({ status: 200, description: "Event updated successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @UsePipes(new ValidationPipe({ transform: true }))
  updateEvent(
    @Param("id") id: number,
    @Body() updateEventDto: UpdateEventDto,
    @Res() response: Response
  ) {
    const userId = '016badad-22b0-4566-88e9-aab1b35b1dfc';
    return this.notificationeventsService.updateNotificationTemplate(
      id,
      updateEventDto,
      userId,
      response
    );
  }


  @UseFilters(new AllExceptionsFilter(APIID.TEMPLATE_DELETE))
  @Delete('/:id')
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  deleteTemplate(@Param('id') id: number, @Res() response: Response) {
    return this.notificationeventsService.deleteTemplate(id, response)
  }

}
