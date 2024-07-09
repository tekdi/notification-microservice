import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationActions } from './entity/notificationActions.entity';
import { SearchFilterDto } from './dto/searchTemplateType.dto';
import APIResponse from 'src/common/utils/response';
import { Response } from 'express';
import { CreateEventDto } from './dto/createTemplate.dto';
import { NotificationActionTemplates } from './entity/notificationActionTemplates.entity';
import { UpdateEventDto } from './dto/updateEventTemplate.dto';
import { LoggerService } from 'src/common/logger/logger.service';
import { APIID } from 'src/common/utils/api-id.config';
@Injectable()
export class NotificationEventsService {

    constructor(
        @InjectRepository(NotificationActions)
        private notificationTemplatesRepository: Repository<NotificationActions>,
        @InjectRepository(NotificationActionTemplates)
        private notificationTemplateConfigRepository: Repository<NotificationActionTemplates>,
        private readonly logger: LoggerService
    ) { }

    async createTemplate(userId: string, data: CreateEventDto, response: Response): Promise<Response> {
        const apiId = APIID.TEMPLATE_CREATE;
        try {

            const existingTemplate =
                await this.notificationTemplatesRepository.findOne({
                    where: { context: data.context, key: data.key },
                });
            if (existingTemplate) {
                this.logger.log(
                    apiId,
                    '/create Template for Notification',
                    'Alredy Template Exist',
                );
                throw new BadRequestException('Template Already exist');
            }
            this.validateConfigBody(data.email);
            this.validateConfigBody(data.push);
            this.validateConfigBody(data.sms);

            const notificationTemplate = new NotificationActions();
            notificationTemplate.title = data.title;
            notificationTemplate.key = data.key;
            notificationTemplate.status = data.status;
            notificationTemplate.context = data.context;
            notificationTemplate.replacementTags = data.replacementTags;
            notificationTemplate.createdBy = userId;
            const notificationTemplateResult = await this.notificationTemplatesRepository.save(notificationTemplate);
            // create config details
            const createConfig = async (type: string, configData: any) => {
                const templateConfig = new NotificationActionTemplates();
                Object.assign(templateConfig, {
                    subject: configData.subject,
                    body: configData.body,
                    status: data.status,
                    type: type,
                    language: 'en',
                    actionId: notificationTemplateResult.actionId,
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
            return APIResponse.success(response, apiId, { id: notificationTemplateResult.actionId }, HttpStatus.CREATED, "Created");
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
                where: { actionId: id },
            });
            if (!existingTemplate) {
                this.logger.log(
                    `${apiId}`,
                    '/Update Template for Notification',
                    'Template Not Exist',
                );
                throw new BadRequestException('Template not existing');
            }

            // Validate email, push, and sms bodies
            this.validateConfigBody(updateEventDto.email);
            this.validateConfigBody(updateEventDto.push);
            this.validateConfigBody(updateEventDto.sms);

            Object.assign(existingTemplate, updateEventDto);
            const result = await this.notificationTemplatesRepository.save(existingTemplate);
            const createConfig = async (type: string, configData?: any) => {
                if (configData && Object.keys(configData).length > 0) {
                    let existingConfig = await this.notificationTemplateConfigRepository.findOne({
                        where: { actionId: id, type: type },
                    });
                    if (existingConfig) {
                        Object.assign(existingConfig, configData);
                        existingConfig.updatedBy = userId
                        return await this.notificationTemplateConfigRepository.save(existingConfig);
                    }
                    else {
                        existingConfig = this.notificationTemplateConfigRepository.create({
                            actionId: id,
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
                    where: { actionId: id },
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
            const { context, key } = searchFilterDto.filters;
            let whereCondition: any = { context };
            if (key) {
                whereCondition.key = key;
            }
            const result = await this.notificationTemplatesRepository.find({
                where: whereCondition,
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

    async deleteTemplate(actionId: number, response: Response) {
        const apiId = APIID.TEMPLATE_DELETE
        try {
            const templateId = await this.notificationTemplatesRepository.find({ where: { actionId } });
            if (!templateId) {
                return APIResponse.error(
                    response,
                    apiId,
                    `No event id found: ${actionId}`,
                    'records not found.',
                    HttpStatus.NOT_FOUND
                )
            }
            const deleteTemplate = await this.notificationTemplatesRepository.delete({ actionId });
            if (deleteTemplate.affected !== 1) {
                throw new BadRequestException('Template not deleted');
            }
            return APIResponse.success(
                response,
                apiId,
                `Template with ID ${actionId} deleted successfully.`,
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


    private validateVariables(body: string) {
        const variablePattern = /{#var(\d+)#}/g;
        const variables = [...body.matchAll(variablePattern)].map(match => parseInt(match[1]));
        // Check if variables are sequentially ordered
        for (let i = 0; i < variables.length; i++) {
            if (variables[i] !== i) {
                throw new BadRequestException(`Variables should be in sequential order starting from {#var0#}. Found: {#var${variables[i]}#}`);
            }
        }
    }

    private validateConfigBody(config: any) {
        if (config && config.body) {
            this.validateVariables(config.body);
        }
    }

}


