import { BadRequestException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
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
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/common/utils/constant.util';
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
        const existingTemplate =
            await this.notificationTemplatesRepository.findOne({
                where: { context: data.context, key: data.key },
            });
        if (existingTemplate) {
            this.logger.log(
                apiId,
                SUCCESS_MESSAGES.CREATE_TEMPLATE_API,
                ERROR_MESSAGES.TEMPLATE_ALREADY_EXIST,
            );
            throw new BadRequestException(ERROR_MESSAGES.TEMPLATE_ALREADY_EXIST);
        }

        const notificationTemplate = new NotificationActions();
        notificationTemplate.title = data.title;
        notificationTemplate.key = data.key;
        notificationTemplate.status = data.status;
        notificationTemplate.context = data.context;
        notificationTemplate.replacementTags = data.replacementTags;
        notificationTemplate.createdBy = userId;
        notificationTemplate.updatedBy = userId;
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
                updatedBy: userId,
                image: type === 'push' ? configData?.image || null : null,
                link: type === 'push' ? configData?.link || null : null
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
        return APIResponse.success(response, apiId, { id: notificationTemplateResult.actionId }, HttpStatus.CREATED, SUCCESS_MESSAGES.TEMPLATE_UPDATE);
    }

    async updateNotificationTemplate(
        id: number,
        updateEventDto: UpdateEventDto,
        userId: string,
        response: Response
    ) {
        const apiId = APIID.TEMPLATE_UPDATE;
        const existingTemplate = await this.notificationTemplatesRepository.findOne({
            where: { actionId: id },
        });
        if (!existingTemplate) {
            this.logger.log(
                `${apiId}`,
                SUCCESS_MESSAGES.UPDATE_TEMPLATE_API,
                ERROR_MESSAGES.TEMPLATE_NOT_EXIST,
            );
            throw new BadRequestException(ERROR_MESSAGES.TEMPLATE_NOT_EXIST);
        }

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
        return APIResponse.success(response, apiId, { id: id }, HttpStatus.OK, SUCCESS_MESSAGES.TEMPLATE_UPDATE);
    }

    async getTemplates(searchFilterDto: SearchFilterDto, response: Response) {
        const apiId = APIID.TEMPLATE_LIST
        const { context, key } = searchFilterDto?.filters;
        let whereCondition: any = { context };
        if (key) {
            whereCondition.key = key;
        }
        const result = await this.notificationTemplatesRepository.find({
            where: whereCondition,
            relations: ["templateconfig"],
        });

        if (result.length === 0) {
            throw new NotFoundException(ERROR_MESSAGES.TEMPLATE_NOTFOUND)
        }
        const finalResult = result.map(item => {
            const { templateconfig, ...rest } = item;
            const formattedTemplateConfig = templateconfig.reduce((acc, config) => {
                const { type, language, subject, body, createdOn, image, link } = config;
                acc[type] = { language, subject, body, createdOn, image, link };
                return acc;
            }, {});
            return { ...rest, templates: formattedTemplateConfig };
        });
        return APIResponse.success(response, apiId, finalResult, HttpStatus.OK, SUCCESS_MESSAGES.TEMPLATE_GET);
    }

    async deleteTemplate(actionId: number, response: Response) {
        const apiId = APIID.TEMPLATE_DELETE
        const templateId = await this.notificationTemplatesRepository.findOne({ where: { actionId } });
        if (!templateId) {
            throw new NotFoundException(ERROR_MESSAGES.TEMPLATE_ID_NOTFOUND(actionId))
        }
        const deleteTemplate = await this.notificationTemplatesRepository.delete({ actionId });
        if (deleteTemplate.affected !== 1) {
            throw new BadRequestException(ERROR_MESSAGES.TEMPLATE_NOT_DELETED);
        }
        return APIResponse.success(
            response,
            apiId,
            SUCCESS_MESSAGES.TEMPLATE_DELETE_ID,
            HttpStatus.OK,
            SUCCESS_MESSAGES.TEMPLATE_DELETE,
        )
    }
}


