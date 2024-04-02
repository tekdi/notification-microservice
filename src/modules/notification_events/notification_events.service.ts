import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEvents } from './entity/notification_events.entity';
import { UpdateResult, DeleteResult } from 'typeorm';


@Injectable()
export class NotificationEventsService {

    constructor(
        @InjectRepository(NotificationEvents)
        private notificationEventsRepository: Repository<NotificationEvents>,
    ) { }

    async findAll(): Promise<NotificationEvents[]> {
        return await this.notificationEventsRepository.find();
    }

    async create(notification_event: NotificationEvents): Promise<NotificationEvents> {
        return await this.notificationEventsRepository.save(notification_event);
    }

    async update(notification_event: NotificationEvents): Promise<UpdateResult> {
        return await this.notificationEventsRepository.update(notification_event.id, notification_event);
    }

    async delete(id): Promise<DeleteResult> {
        return await this.notificationEventsRepository.delete(id);
    }

    // async findOne(action): Promise<Notification_Events[]> {
    //     return await this.notificationEventsRepository.find(action);
    // }

    async getNotificationEventByAction(action): Promise<NotificationEvents> {
        const Notification_Events = await this.notificationEventsRepository.findOne(
            {
                where:
                    { action: action }
            }
        );
        return Notification_Events;
        // return await this.notificationEventsRepository.findOne({Notification_Events.action:action});
    }

}
