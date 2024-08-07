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

@Injectable()
export class NotificationQueueService {
    constructor(
        @InjectRepository(NotificationQueue)
        private readonly notificationQueueRepo: Repository<NotificationQueue>
    ) { }

    async create(notificationQueueDTO: NotificationQueueDTO, response) {
        const apiId = APIID.QUEUE_CREATE;
        try {
            const result = await this.notificationQueueRepo.save(notificationQueueDTO);
            return APIResponse.success(response, apiId, { result: result.id }, HttpStatus.CREATED, 'Queue Created')
        }
        catch (e) {
            const errorMessage = e.message || 'Internal server error';
            return APIResponse.error(response, apiId, "Internal Server Error", errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
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
                throw new BadRequestException(`No notification queue found for: ${id}`)
            }
            Object.assign(queue, updateQueueDTO);
            const updateResult = await this.notificationQueueRepo.save(queue);
            if (!updateResult) {
                throw new BadRequestException('Event update failed');
            }
            return { updateResult, status: HttpStatus.OK }
        }
        catch (e) {
            const errorMessage = e.message || 'Internal server error';
            return errorMessage;
        }

    }
}
