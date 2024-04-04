import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { Response } from 'express';
import APIResponse from 'src/common/utils/response';
import { NotificationQueueDTO } from './dto/notificationQueue.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationQueue } from './entities/notificationQueue.entity';
import { Repository } from 'typeorm';
import { SearchQueueDTO } from './dto/searchQueue.dto';
import { UpdateQueueDTO } from './dto/updateQueue.dto';


@Injectable()
export class NotificationQueueService {

    constructor(
        @InjectRepository(NotificationQueue)
        private readonly notificationQueueRepo: Repository<NotificationQueue>
    ) { }

    async create(notificationQueueDTO: NotificationQueueDTO, response: Response) {
        const apiId = 'api.create.notificationQueue';
        try {
            const result = await this.notificationQueueRepo.save(notificationQueueDTO);
            return response
                .status(HttpStatus.CREATED)
                .send(APIResponse.success(apiId, { result: result.id }, 'Created'))
        }
        catch (e) {
            return response
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .send(APIResponse.error(
                    apiId,
                    'Something went wrong in Queue creation',
                    JSON.stringify(e),
                    'INTERNAL_SERVER_ERROR',
                ))
        }
    }

    async getList(searchQueueDTO: SearchQueueDTO, response: Response) {
        const apiId = 'api.get.queues';
        try {
            const { channel, context, status } = searchQueueDTO;
            const result = await this.notificationQueueRepo.find({
                where: { channel: channel, context: context, status: status }
            })
            if (result.length === 0) {
                return response
                    .status(HttpStatus.NOT_FOUND)
                    .send(
                        APIResponse.error(
                            apiId,
                            `No data found in queue`,
                            'No records found.',
                            'NOT_FOUND',
                        ),
                    );
            }
            return response
                .status(HttpStatus.OK)
                .send(APIResponse.success(apiId, result, 'OK'))
        }
        catch (e) {
            return response
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .send(APIResponse.error(
                    apiId,
                    'Something went wrong in Queue creation',
                    JSON.stringify(e),
                    'INTERNAL_SERVER_ERROR',
                ))
        }
    }

    async updateQueue(id: string, updateQueueDTO: UpdateQueueDTO, response: Response) {
        const apiId = 'api.update.Queue';
        try {
            const queue = await this.notificationQueueRepo.findOne({ where: { id } });
            if (!queue) {
                return response.status(HttpStatus.NOT_FOUND).send(
                    APIResponse.error(
                        apiId,
                        `No notification queue found for: ${id}`,
                        'records not found.',
                        'NOT_FOUND',
                    ),
                );
            }
            Object.assign(queue, updateQueueDTO);
            const updateResult = await this.notificationQueueRepo.save(queue);
            if (!updateResult) {
                throw new BadRequestException('Event update failed');
            }
            return response
                .status(HttpStatus.OK)
                .send(APIResponse.success(apiId, updateResult, 'OK'))
        }
        catch (e) {
            return response
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .send(APIResponse.error(
                    apiId,
                    'Something went wrong in update Queue',
                    JSON.stringify(e),
                    'INTERNAL_SERVER_ERROR',
                ))
        }

    }
}
