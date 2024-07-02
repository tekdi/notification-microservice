import { Body, Controller, Param, ParseUUIDPipe, Patch, Post, Res, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { NotificationQueueService } from './notificationQueue.service';
import { NotificationQueueDTO } from './dto/notificationQueue.dto';
import { SearchQueueDTO } from './dto/searchQueue.dto';
import { UpdateQueueDTO } from './dto/updateQueue.dto';
import { APIID } from 'src/common/utils/api-id.config';
import { AllExceptionsFilter } from 'src/common/filters/exception.filter';

@Controller('queue')
@ApiTags('Notification-queue')
export class NotificationQueueController {

    constructor(private readonly notificationQueueService: NotificationQueueService) { }

    @UseFilters(new AllExceptionsFilter(APIID.QUEUE_CREATE))
    @Post()
    @ApiCreatedResponse({ description: "created" })
    @ApiInternalServerErrorResponse({ description: 'internal server error' })
    @ApiBadRequestResponse({ description: 'Invalid request' })
    @UsePipes(new ValidationPipe({ transform: true }))
    @ApiBody({ type: NotificationQueueDTO })
    async create(@Body() notificationQueueDTO, @Res() response: Response) {
        return this.notificationQueueService.create(notificationQueueDTO, response);
    }

    @UseFilters(new AllExceptionsFilter(APIID.QUEUE_LIST))
    @Post('/list')
    @ApiOkResponse({ description: 'Get Records from queue' })
    @ApiInternalServerErrorResponse({ description: 'Interbal Server error' })
    @ApiBadRequestResponse({ description: 'Ivalid Request' })
    @ApiBody({ type: SearchQueueDTO })
    @UsePipes(new ValidationPipe({ transform: true }))
    async get(@Body() searchQueueDTO: SearchQueueDTO, @Res() response: Response) {
        this.notificationQueueService.getList(searchQueueDTO, response)
    }

    @UseFilters(new AllExceptionsFilter(APIID.QUEUE_GET))
    @Patch('/:id')
    @ApiBadRequestResponse({ description: 'Invalid Request' })
    @ApiOkResponse({ description: 'Updated Sucessfully' })
    @ApiBody({ type: UpdateQueueDTO })
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateQueueDTO: UpdateQueueDTO) {
        return this.notificationQueueService.updateQueue(id, updateQueueDTO)
    }
}
