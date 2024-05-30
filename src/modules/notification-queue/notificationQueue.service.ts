import { HttpStatus, Injectable } from '@nestjs/common';
import { Response } from 'express';
import APIResponse from 'src/common/utils/response';
import { NotificationQueueDTO } from './dto/notificationQueue.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationQueue } from './entities/notificationQueue.entity';
import { Repository } from 'typeorm';


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
}
