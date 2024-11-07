import { BadRequestException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationActions } from './entity/notificationActions.entity';
import { SearchFilterDto } from './dto/searchTemplateType.dto';
import APIResponse from 'src/common/utils/response';
import { Response } from 'express';
import { CreateEventDto } from './dto/createTemplate.dto';
import { NotificationActionTemplates } from './entity/notificationActionTemplates.entity';
import { UpdateEventDto } from './dto/updateEventTemplate.dto';
import { APIID } from 'src/common/utils/api-id.config';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/common/utils/constant.util';
import { LoggerUtil } from 'src/common/logger/LoggerUtil';
@Injectable()
export class NotificationEventsService {

    constructor(
        @InjectRepository(NotificationActions)
        private notificationTemplatesRepository: Repository<NotificationActions>,
        @InjectRepository(NotificationActionTemplates)
        private notificationTemplateConfigRepository: Repository<NotificationActionTemplates>
    ) { }

    async createTemplate(userId: string, data: CreateEventDto, response: Response): Promise<Response> {
        const apiId = APIID.TEMPLATE_CREATE;
        const existingTemplate =
            await this.notificationTemplatesRepository.findOne({
                where: { context: data.context, key: data.key },
            });
        if (existingTemplate) {
            LoggerUtil.log(apiId, SUCCESS_MESSAGES.CREATE_TEMPLATE_API, ERROR_MESSAGES.TEMPLATE_ALREADY_EXIST, userId);
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
        LoggerUtil.log(SUCCESS_MESSAGES.TEMPLATE_CREATED_SUCESSFULLY(userId), `templateId: ${notificationTemplateResult.actionId}`, '/create/template');
        return response
            .status(HttpStatus.CREATED)
            .json(APIResponse.success(apiId, notificationTemplateResult, 'Created'));
    }

    async updateNotificationTemplate(
        id: number,
        updateEventDto: UpdateEventDto,
        userId: string,
        response: Response
    ) {
        const apiId = APIID.TEMPLATE_UPDATE;
        updateEventDto.updatedBy = userId;
        //check actionId exist or not
        const existingTemplate = await this.notificationTemplatesRepository.findOne({
            where: { actionId: id },
        });
        if (!existingTemplate) {
            LoggerUtil.log(apiId, SUCCESS_MESSAGES.UPDATE_TEMPLATE_API, ERROR_MESSAGES.TEMPLATE_NOT_EXIST, userId);
            throw new BadRequestException(ERROR_MESSAGES.TEMPLATE_NOT_EXIST);
        }
        //check key already exist for this context
        if (updateEventDto.key) {
            const checkKeyAlreadyExist =
                await this.notificationTemplatesRepository.findOne({
                    where: { context: existingTemplate.context, key: updateEventDto.key },
                });
            if (checkKeyAlreadyExist) {
                LoggerUtil.error(apiId, ERROR_MESSAGES.ALREADY_EXIST_KEY_FOR_CONTEXT, `requested By  ${userId}`);
                throw new BadRequestException(ERROR_MESSAGES.ALREADY_EXIST_KEY_FOR_CONTEXT_ENTER_ANOTHER);
            }
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
                    if (!configData.subject || !configData.body) {
                        throw new BadRequestException(ERROR_MESSAGES.NOT_EMPTY_SUBJECT_OR_BODY);
                    }
                    const newConfig = this.notificationTemplateConfigRepository.create({
                        actionId: id,
                        type: type,
                        subject: configData.subject,
                        body: configData.body,
                        status: result.status,
                        language: 'en',
                        updatedBy: userId,
                        createdBy: userId, // getting null constraint error
                        image: configData.image || null,
                        link: configData.link || null
                    });
                    return await this.notificationTemplateConfigRepository.save(newConfig);
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
        LoggerUtil.log(`Template updated successfully by userId: ${userId}`, `Id: ${id}`, '/update/template');
        return response
            .status(HttpStatus.OK)
            .json(APIResponse.success(apiId, { id: id }, 'OK'));
    }

    async getTemplates(searchFilterDto: SearchFilterDto, userId: string, response: Response) {
        const apiId = APIID.TEMPLATE_LIST;
        const { context } = searchFilterDto.filters;
        const key = searchFilterDto.filters?.key;

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
        LoggerUtil.log(SUCCESS_MESSAGES.GET_TEMPLATE(userId), '/get/template');
        return response
            .status(HttpStatus.OK)
            .json(APIResponse.success(apiId, finalResult, 'OK'));
    }

    async deleteTemplate(actionId: number, userId: string, response: Response) {
        const apiId = APIID.TEMPLATE_DELETE;
        const templateId = await this.notificationTemplatesRepository.findOne({ where: { actionId } });
        if (!templateId) {
            LoggerUtil.log(apiId, SUCCESS_MESSAGES.UPDATE_TEMPLATE_API, ERROR_MESSAGES.TEMPLATE_NOT_EXIST, userId);
            throw new NotFoundException(ERROR_MESSAGES.TEMPLATE_ID_NOTFOUND(actionId))
        }
        const deleteTemplate = await this.notificationTemplatesRepository.delete({ actionId });
        if (deleteTemplate.affected !== 1) {
            throw new BadRequestException(ERROR_MESSAGES.TEMPLATE_NOT_DELETED);
        }
        LoggerUtil.log(SUCCESS_MESSAGES.DELETE_TEMPLATE(userId), '/delete/template');
        return response
            .status(HttpStatus.OK)
            .json(APIResponse.success(apiId, { id: actionId }, 'OK'));
    }
}


