import { Body, Controller, Param, ParseUUIDPipe, Patch, Post, Query, Res, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { NotificationQueueService } from './notificationQueue.service';
import { NotificationQueueDTO } from './dto/notificationQueue.dto';
import { SearchQueueDTO } from './dto/searchQueue.dto';
import { UpdateQueueDTO } from './dto/updateQueue.dto';
import { APIID } from 'src/common/utils/api-id.config';
import { AllExceptionsFilter } from 'src/common/filters/exception.filter';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/common/utils/constant.util';

@Controller('queue')
@ApiTags('Notification-queue')
export class NotificationQueueController {

    constructor(private readonly notificationQueueService: NotificationQueueService) { }

    @UseFilters(new AllExceptionsFilter(APIID.QUEUE_CREATE))
    @Post()
    @ApiCreatedResponse({ description: SUCCESS_MESSAGES.CREATED })
    @ApiInternalServerErrorResponse({ description: ERROR_MESSAGES.INTERNAL_SERVER_ERROR })
    @ApiBadRequestResponse({ description: ERROR_MESSAGES.INVALID_REQUEST })
    @UsePipes(new ValidationPipe({ transform: true }))
    @ApiBody({ type: NotificationQueueDTO })
    async create(@Body() notificationQueueDTO, @Res() response: Response) {
        return this.notificationQueueService.create(notificationQueueDTO, response);
    }

    @UseFilters(new AllExceptionsFilter(APIID.QUEUE_LIST))
    @Post('/list')
    @ApiOkResponse({ description: SUCCESS_MESSAGES.QUEUE_LIST })
    @ApiInternalServerErrorResponse({ description: ERROR_MESSAGES.INTERNAL_SERVER_ERROR })
    @ApiBadRequestResponse({ description: 'Ivalid Request' })
    @ApiBody({ type: SearchQueueDTO })
    @UsePipes(new ValidationPipe({ transform: true }))
    async get(@Body() searchQueueDTO: SearchQueueDTO, @Res() response: Response) {
        this.notificationQueueService.getList(searchQueueDTO, response)
    }

    @UseFilters(new AllExceptionsFilter(APIID.QUEUE_GET))
    @Patch('/:id')
    @ApiBadRequestResponse({ description: ERROR_MESSAGES.INVALID_REQUEST })
    @ApiOkResponse({ description: SUCCESS_MESSAGES.QUEUE_UPDATED })
    @ApiBody({ type: UpdateQueueDTO })
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateQueueDTO: UpdateQueueDTO) {
        return this.notificationQueueService.updateQueue(id, updateQueueDTO)
    }
}
