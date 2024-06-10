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
import { APIID } from 'src/common/utils/api-id.config';
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
        const apiId = APIID.TEMPLATE_CREATE;
        try {
            const existingTemplate =
                await this.notificationTemplatesRepository.findOne({
                    where: { context: data.context },
                });
            if (existingTemplate) {
                this.logger.log(
                    apiId,
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
            return APIResponse.success(response, apiId, { id: notificationTemplateResult.id }, HttpStatus.CREATED, "Created");
        } catch (e) {
            this.logger.error(
                `/Create Template for Notification`,
                e,
                '/Failed',
            );
            const errorMessage = e.message || 'Internal server error';
            return APIResponse.error(response, apiId, "Internal Server Error", errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);

        }
    }

    async updateNotificationTemplate(
        id: number,
        updateEventDto: UpdateEventDto,
        userId: string,
        response: Response
    ) {
        const apiId = APIID.TEMPLATE_UPDATE;
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
            return APIResponse.success(response, apiId, { id: id }, HttpStatus.OK, "Updated Sccessfully");
        } catch (e) {
            this.logger.error(
                `/Update Template for Notification`,
                e,
                '/Failed',
            );
            const errorMessage = e.message || 'Internal server error';
            return APIResponse.error(response, apiId, "Internal Server Error", errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getTemplatesTypesForEvent(searchFilterDto: SearchFilterDto, response: Response) {
        const apiId = APIID.TEMPLATE_LIST
        try {
            const context = searchFilterDto.filters.context;
            const result = await this.notificationTemplatesRepository.find({
                where: { context },
                relations: ["templateconfig"],
            });

            if (result.length === 0) {
                return APIResponse.error(
                    response,
                    apiId,
                    `No templates found`,
                    'No records found.',
                    HttpStatus.NOT_FOUND,
                )
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
            return APIResponse.success(response, apiId, finalResult, HttpStatus.OK, 'fetched successfully');
        }
        catch (e) {
            this.logger.error(
                `/Get Template `,
                e,
                '/Failed',
            );
            const errorMessage = e.message || 'Internal server error';
            return APIResponse.error(response, apiId, "Internal Server Error", errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async deleteTemplate(id: number, response: Response) {
        const apiId = APIID.TEMPLATE_DELETE
        try {
            const templateId = await this.notificationTemplatesRepository.find({ where: { id } });
            if (!templateId) {
                return APIResponse.error(
                    response,
                    apiId,
                    `No event id found: ${id}`,
                    'records not found.',
                    HttpStatus.NOT_FOUND
                )
            }
            const deleteTemplate = await this.notificationTemplatesRepository.delete({ id });
            if (deleteTemplate.affected !== 1) {
                throw new BadRequestException('Template not deleted');
            }
            return APIResponse.success(
                response,
                apiId,
                `Template with ID ${id} deleted successfully.`,
                HttpStatus.OK,
                'deleted successfully',
            )
        }
        catch (e) {
            this.logger.error(
                `/Delete Template`,
                e,
                '/Failed',
            );
            const errorMessage = e.message || 'Internal server error';
            return APIResponse.error(response, apiId, "Internal Server Error", errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
        }

    }

}
