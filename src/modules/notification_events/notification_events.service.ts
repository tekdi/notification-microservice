import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplates } from './entity/notificationTemplate.entity';
import { SearchFilterDto } from './dto/searchTemplateType.dto';
import APIResponse from 'src/common/utils/response';
import { Response } from 'express';
import { CreateEventDto } from './dto/createTemplate.dto';
import { NotificationTemplateConfig } from './entity/notificationTemplateConfig.entity';
import { UpdateEventDto } from './dto/updateEventTemplate.dto';
import { LoggerService } from 'src/common/logger/logger.service';
@Injectable()
export class NotificationEventsService {

    constructor(
        @InjectRepository(NotificationTemplates)
        private notificationTemplatesRepository: Repository<NotificationTemplates>,
        @InjectRepository(NotificationTemplateConfig)
        private notificationTemplateConfigRepository: Repository<NotificationTemplateConfig>,
        private readonly logger: LoggerService
    ) { }

    async createTemplate(userId: string, data: CreateEventDto, response: Response): Promise<Response> {
        const apiId = "api.create.notificationTemplate";
        try {
            const existingTemplate =
                await this.notificationTemplatesRepository.findOne({
                    where: { context: data.context },
                });
            if (existingTemplate) {
                this.logger.log(
                    `${apiId}`,
                    '/create Template for Notification',
                    'Alredy Template Exist',
                );
                throw new BadRequestException('Template Already exist');
            }
            const notificationTemplate = new NotificationTemplates();
            notificationTemplate.title = data.title;
            notificationTemplate.key = data.key;
            notificationTemplate.status = data.status;
            notificationTemplate.context = data.context;
            notificationTemplate.replacementTags = data.replacementTags;
            notificationTemplate.createdBy = userId;
            const notificationTemplateResult = await this.notificationTemplatesRepository.save(notificationTemplate);
            // create config details
            const createConfig = async (type: string, configData: any) => {
                const templateConfig = new NotificationTemplateConfig();
                Object.assign(templateConfig, {
                    subject: configData.subject,
                    body: configData.body,
                    status: data.status,
                    type: type,
                    language: 'en',
                    template_id: notificationTemplateResult.id,
                    createdBy: userId,
                });
                return await this.notificationTemplateConfigRepository.save(templateConfig);
            };

            if (data.email && Object.keys(data.email).length > 0) {
                await createConfig('email', data.email);
            }

            if (data.push && Object.keys(data.push).length > 0) {
                await createConfig('push', data.push);
            }

            if (data.sms && Object.keys(data.sms).length > 0) {
                await createConfig('sms', data.sms);
            }
            return response
                .status(HttpStatus.CREATED)
                .send(APIResponse.success(apiId, { id: notificationTemplateResult.id }, "Created"));
        } catch (e) {
            this.logger.error(
                `/Create Template for Notification`,
                e,
                '/Failed',
            );
            return response
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .send(
                    APIResponse.error(
                        apiId,
                        "Something went wrong in template creation",
                        JSON.stringify(e),
                        "INTERNAL_SERVER_ERROR"
                    )
                );
        }
    }

    async updateNotificationTemplate(
        id: number,
        updateEventDto: UpdateEventDto,
        userId: string,
        response: Response
    ) {
        const apiId = "api.update.notification.notificationtemplate";
        try {
            const existingTemplate = await this.notificationTemplatesRepository.findOne({
                where: { id: id },
            });
            if (!existingTemplate) {
                this.logger.log(
                    `${apiId}`,
                    '/Update Template for Notification',
                    'Template Not Exist',
                );
                throw new BadRequestException('Template not existing');
            }
            Object.assign(existingTemplate, updateEventDto);
            const result = await this.notificationTemplatesRepository.save(existingTemplate);
            const createConfig = async (type: string, configData?: any) => {
                if (configData && Object.keys(configData).length > 0) {
                    let existingConfig = await this.notificationTemplateConfigRepository.findOne({
                        where: { template_id: id, type: type },
                    });
                    if (existingConfig) {
                        Object.assign(existingConfig, configData);
                        existingConfig.updatedBy = userId
                        return await this.notificationTemplateConfigRepository.save(existingConfig);
                    }
                    else {
                        existingConfig = this.notificationTemplateConfigRepository.create({
                            template_id: id,
                            type: type,
                            subject: configData.subject,
                            body: configData.body,
                            status: result.status,
                            language: 'en',
                            createdBy: userId,
                            updatedBy: userId
                        });
                        return await this.notificationTemplateConfigRepository.save(existingConfig);
                    }
                }
            };
            if (updateEventDto.email && Object.keys(updateEventDto.email).length > 0) {
                await createConfig('email', updateEventDto.email);
            }

            if (updateEventDto.push && Object.keys(updateEventDto.push).length > 0) {
                await createConfig('push', updateEventDto.push);
            }

            if (updateEventDto.sms && Object.keys(updateEventDto.sms).length > 0) {
                await createConfig('sms', updateEventDto.sms);
            }

            if (updateEventDto.status) {
                let existingConfig = await this.notificationTemplateConfigRepository.find({
                    where: { template_id: id },
                });
                existingConfig.forEach(async (config) => {
                    if (updateEventDto.status) {
                        config.status = updateEventDto.status;
                        await this.notificationTemplateConfigRepository.save(config);
                    }
                });

            }
            return response
                .status(HttpStatus.OK)
                .send(APIResponse.success(apiId, { id: id, status: "Updated Sccessfully" }, "Updated"));
        } catch (e) {
            this.logger.error(
                `/Update Template for Notification`,
                e,
                '/Failed',
            );
            return response
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .send(
                    APIResponse.error(
                        apiId,
                        "Something went wrong in event updation",
                        JSON.stringify(e),
                        "INTERNAL_SERVER_ERROR"
                    )
                );
        }
    }

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
            const result = await this.notificationTemplatesRepository.find({
                where: { context },
                relations: ["templateconfig"],
            });

            if (result.length === 0) {
                return response
                    .status(HttpStatus.NOT_FOUND)
                    .send(
                        APIResponse.error(
                            apiId,
                            `No temnplates found`,
                            'No records found.',
                            'NOT_FOUND',
                        ),
                    );
            }
            const finalResult = result.map(item => {
                const { templateconfig, ...rest } = item;
                const formattedTemplateConfig = templateconfig.reduce((acc, config) => {
                    const { type, language, subject, body, createdOn } = config;
                    acc[type] = { language, subject, body, createdOn };
                    return acc;
                }, {});
                return { ...rest, templates: formattedTemplateConfig };
            });
            return response
                .status(HttpStatus.OK)
                .send(APIResponse.success(apiId, finalResult, 'OK'));
        }
        catch (e) {
            this.logger.error(
                `/Get Template `,
                e,
                '/Failed',
            );
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
