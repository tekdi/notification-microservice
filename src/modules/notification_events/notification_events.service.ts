import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplates } from './entity/notificationTemplate.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { SearchFilterDto } from './dto/searchTemplateType.dto';
import APIResponse from 'src/common/utils/response';
import { Response } from 'express';


@Injectable()
export class NotificationEventsService {

    constructor(
        @InjectRepository(NotificationTemplates)
        private notificationTemplatesRepository: Repository<NotificationTemplates>,
    ) { }

    // async findAll(): Promise<NotificationTemplates[]> {
    //     return await this.notificationEventsRepository.find();
    // }

    // async create(notification_event: NotificationTemplates): Promise<NotificationTemplates> {
    //     return await this.notificationEventsRepository.save(notification_event);
    // }

    // async update(notification_event: NotificationTemplates): Promise<UpdateResult> {
    //     return await this.notificationEventsRepository.update(notification_event.id, notification_event);
    // }

    // async delete(id): Promise<DeleteResult> {
    //     return await this.notificationEventsRepository.delete(id);
    // }

    // // async findOne(action): Promise<Notification_Events[]> {
    // //     return await this.notificationEventsRepository.find(action);
    // // }

    // //check nototification aleardy present or not for this action
    // async getNotificationEventByAction(action): Promise<NotificationTemplates> {
    //     const Notification_Events = await this.notificationEventsRepository.findOne(
    //         {
    //             where:
    //                 { action: action }
    //         }
    //     );
    //     return Notification_Events;
    //     // return await this.notificationEventsRepository.findOne({Notification_Events.action:action});
    // }

    async getTemplatesTypesForEvent(searchFilterDto: SearchFilterDto, response: Response) {
        const apiId = 'api.get.TemplateTypeOfEvent';
        try {
            const context = searchFilterDto.filters.context;
            const queryBuilder = this.notificationTemplatesRepository
                .createQueryBuilder('template')
                .select([
                    'template.title AS title',
                    'template.status AS status',
                    'template.key AS key',
                    'templateconfig.language AS language',
                    'templateconfig.subject AS subject',
                    'templateconfig.body AS body',
                    'templateconfig.type AS type'
                ])
                .leftJoin('template.templateconfig', 'templateconfig', 'templateconfig.template_id = template.id')
                .where('template.context = :context', { context: context })
            const result = await queryBuilder.getRawMany();
            if (result.length === 0) {
                return response
                    .status(HttpStatus.NOT_FOUND)
                    .send(
                        APIResponse.error(
                            apiId,
                            `No temnplate tyoe found`,
                            'No records found.',
                            'NOT_FOUND',
                        ),
                    );
            }
            const templateconfig = result.reduce((acc, item) => {
                const { type, language, subject, body } = item;
                if (!acc[type]) {
                    acc[type] = {};
                }
                Object.assign(acc[type], { language, subject, body })
                return acc;
            }, {});

            const finalResponse = {
                title: result[0]?.title || '',
                status: result[0]?.status || '',
                key: result[0]?.key || '',
                templates: templateconfig
            };
            return response
                .status(HttpStatus.OK)
                .send(APIResponse.success(apiId, finalResponse, 'OK'));
        }
        catch (e) {
            return response
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .send(APIResponse.error(
                    apiId,
                    'Something went wrong in event creation',
                    JSON.stringify(e),
                    'INTERNAL_SERVER_ERROR',
                ))
        }
    }

}
