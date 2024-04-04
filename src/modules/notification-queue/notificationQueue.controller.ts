import { Body, Controller, Param, ParseUUIDPipe, Patch, Post, Res, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { NotificationQueueService } from './notificationQueue.service';
import { NotificationQueueDTO } from './dto/notificationQueue.dto';
import { SearchQueueDTO } from './dto/searchQueue.dto';
import { UpdateQueueDTO } from './dto/updateQueue.dto';

@Controller('queue')
@ApiTags('notification-queue')
export class NotificationQueueController {

    constructor(private readonly notificationQueueService: NotificationQueueService) { }

    @Post()
    @ApiCreatedResponse({ description: "created" })
    @ApiInternalServerErrorResponse({ description: 'internal server error' })
    @ApiBadRequestResponse({ description: 'Invalid request' })
    @UsePipes(new ValidationPipe({ transform: true }))
    @ApiBody({ type: NotificationQueueDTO })
    async create(@Body() notificationQueueDTO: NotificationQueueDTO, @Res() response: Response) {
        return this.notificationQueueService.create(notificationQueueDTO, response);
    }

    @Post('/list')
    @ApiOkResponse({ description: 'Get Records from queue' })
    @ApiInternalServerErrorResponse({ description: 'Interbal Server error' })
    @ApiBadRequestResponse({ description: 'Ivalid Request' })
    @ApiBody({ type: SearchQueueDTO })
    @UsePipes(new ValidationPipe({ transform: true }))
    async get(@Body() searchQueueDTO: SearchQueueDTO, @Res() response: Response) {
        this.notificationQueueService.getList(searchQueueDTO, response)
    }

    @Patch('/:id')
    @ApiBadRequestResponse({ description: 'Invalid Request' })
    @ApiOkResponse({ description: 'Updated Sucessfully' })
    @ApiBody({ type: UpdateQueueDTO })
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateQueueDTO: UpdateQueueDTO, @Res() response: Response) {
        return this.notificationQueueService.updateQueue(id, updateQueueDTO, response)
    }
}
