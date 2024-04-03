import { Body, Controller, Get, Patch, Post, Res, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { NotificationQueueService } from './notificationQueue.service';
import { NotificationQueueDTO } from './dto/notificationQueue.dto';


@Controller('notification-queue')
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

    @Get()
    async get() {
        return true;
    }

    @Patch()
    async update() {
        return true;
    }
}
