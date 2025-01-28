import { BadRequestException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import APIResponse from '../../common/utils/response';
import { NotificationQueueDTO } from './dto/notificationQueue.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationQueue } from './entities/notificationQueue.entity';
import { Repository } from 'typeorm';
import { SearchQueueDTO } from './dto/searchQueue.dto';
import { UpdateQueueDTO } from './dto/updateQueue.dto';
import { APIID } from '../../common/utils/api-id.config';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../common/utils/constant.util';
import { TypeormService } from '../typeorm/typeorm.service';


@Injectable()
export class NotificationQueueService {
    constructor(
        @InjectRepository(NotificationQueue)
        private readonly notificationQueueRepo: Repository<NotificationQueue>,
        private readonly typeormService: TypeormService
    ) { }

    async create(notificationQueueDTO: NotificationQueueDTO, response) {
        const apiId = APIID.QUEUE_CREATE;
        const result = await this.typeormService.save(NotificationQueue, notificationQueueDTO);
        return response
            .status(HttpStatus.CREATED)
            .json(APIResponse.success(apiId, result, SUCCESS_MESSAGES.CREATED));
    }

    async getList(searchQueueDTO: SearchQueueDTO, response: Response) {
        const apiId = APIID.QUEUE_LIST;
        const { channel, context, status } = searchQueueDTO;
        const result = await this.typeormService.find(NotificationQueue, {
            where: { channel: channel, context: context, status: status }
        })
        if (result.length === 0) {
            throw new NotFoundException(ERROR_MESSAGES.QUEUE_NOTFOUND)
        }
        return response
            .status(HttpStatus.OK)
            .json(APIResponse.success(apiId, result, 'OK'));
    }

    async updateQueue(id: string, updateQueueDTO: UpdateQueueDTO) {
        const apiId = APIID.QUEUE_UPDATE
        const queue = await this.typeormService.findOne(NotificationQueue, { where: { id } });
        if (!queue) {
            throw new BadRequestException(ERROR_MESSAGES.QUEUE_UPDATE(id))
        }
        Object.assign(queue, updateQueueDTO);
        const updateResult = await this.typeormService.save(NotificationQueue, queue);
        if (!updateResult) {
            throw new BadRequestException(ERROR_MESSAGES.EVENT_UPDATE_FAILED);
        }
        return { updateResult, status: HttpStatus.OK }

    }
}
