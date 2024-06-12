import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { Response } from 'express';
import APIResponse from 'src/common/utils/response';
import { NotificationQueueDTO } from './dto/notificationQueue.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationQueue } from './entities/notificationQueue.entity';
import { Repository } from 'typeorm';
import { SearchQueueDTO } from './dto/searchQueue.dto';
import { UpdateQueueDTO } from './dto/updateQueue.dto';
import { APIID } from 'src/common/utils/api-id.config';
import { AmqpConnection, RabbitSubscribe } from '@nestjs-plus/rabbitmq';
import { PushAdapter } from '../notification/adapters/pushService.adapter';

@Injectable()
export class NotificationQueueService {

    constructor(
        @InjectRepository(NotificationQueue)
        private readonly notificationQueueRepo: Repository<NotificationQueue>,
        private readonly amqpConnection: AmqpConnection,
        private pushAdapter: PushAdapter
    ) { }

    async create(notificationQueueDTO: NotificationQueueDTO, response: Response) {
        const apiId = APIID.QUEUE_CREATE;
        try {
            const result = await this.notificationQueueRepo.save(notificationQueueDTO);
            console.log(result, "notificarion Queue");
            await this.amqpConnection.publish('notification.exchange', 'notification.route', result);
            return APIResponse.success(response, apiId, { result: result.id }, HttpStatus.CREATED, 'Queue Created')
        }
        catch (e) {
            const errorMessage = e.message || 'Internal server error';
            return APIResponse.error(response, apiId, "Internal Server Error", errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @RabbitSubscribe({
        exchange: 'notification.exchange',
        routingKey: 'notification.route',
        queue: 'notification.queue',
    })
    async handleNotification(notification, message: any, retryCount = 3) {
        try {
            console.log(notification, "RabbitMq Queue");
            await this.pushAdapter.sendPushNotification(notification)
            const updateQueueDTO = { status: true, retries: 3 - retryCount, last_attempted: new Date() };
            await this.updateQueue(notification.id, updateQueueDTO)
        } catch (error) {
            if (retryCount > 0) {
                console.log(`Retrying... Attempts left: ${retryCount}`);
                // Add delay between retries if needed
                // setTimeout(async () => {
                await this.handleNotification(notification, message, retryCount - 1);
                // }, 20000);
            } else {
                const updateQueueDTO = { last_attempted: new Date(), retries: 3 };
                await this.updateQueue(notification.id, updateQueueDTO)
                console.log(`Max retries reached. Object not removed: ${notification.id}`);
            }
        }
    }

    async getList(searchQueueDTO: SearchQueueDTO, response: Response) {
        const apiId = APIID.QUEUE_LIST;
        try {
            const { channel, context, status } = searchQueueDTO;
            const result = await this.notificationQueueRepo.find({
                where: { channel: channel, context: context, status: status }
            })
            if (result.length === 0) {
                return APIResponse.error(
                    response,
                    apiId,
                    `No data found in queue`,
                    'No records found.',
                    HttpStatus.NOT_FOUND
                )

            }
            return APIResponse.success(response, apiId, result, HttpStatus.OK, 'fetched successful')
        }
        catch (e) {
            const errorMessage = e.message || 'Internal server error';
            return APIResponse.error(response, apiId, "Internal Server Error", errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async updateQueue(id: string, updateQueueDTO: UpdateQueueDTO) {
        const apiId = APIID.QUEUE_UPDATE
        try {
            const queue = await this.notificationQueueRepo.findOne({ where: { id } });
            if (!queue) {
                // return APIResponse.error(
                //     response,
                //     apiId,
                //     `No notification queue found for: ${id}`,
                //     'records not found.',
                //     HttpStatus.NOT_FOUND
                // )
                throw new BadRequestException(`No notification queue found for: ${id}`)
            }
            Object.assign(queue, updateQueueDTO);
            const updateResult = await this.notificationQueueRepo.save(queue);
            if (!updateResult) {
                throw new BadRequestException('Event update failed');
            }
            return { updateResult, status: HttpStatus.OK }
            // return APIResponse.success(response, apiId, updateResult, HttpStatus.OK, 'Updated successfully')
        }
        catch (e) {
            const errorMessage = e.message || 'Internal server error';
            return errorMessage;
            // return APIResponse.error(response, apiId, "Internal Server Error", errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
        }

    }
}
