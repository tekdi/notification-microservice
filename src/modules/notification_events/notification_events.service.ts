import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { NotificationActions } from './entity/notificationActions.entity';
import { SearchFilterDto } from './dto/searchTemplateType.dto';
import APIResponse from 'src/common/utils/response';
import { Response } from 'express';
import { CreateEventDto } from './dto/createTemplate.dto';
import { NotificationActionTemplates } from './entity/notificationActionTemplates.entity';
import { UpdateEventDto } from './dto/updateEventTemplate.dto';
import { UpdateNotificationActionDto } from './dto/updateNotificationAction.dto';
import { APIID } from 'src/common/utils/api-id.config';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from 'src/common/utils/constant.util';
import { LoggerUtil } from 'src/common/logger/LoggerUtil';
@Injectable()
export class NotificationEventsService {
  constructor(
    @InjectRepository(NotificationActions)
    private notificationTemplatesRepository: Repository<NotificationActions>,
    @InjectRepository(NotificationActionTemplates)
    private notificationTemplateConfigRepository: Repository<NotificationActionTemplates>
  ) {}

  async createTemplate(
    userId: string,
    data: CreateEventDto,
    response: Response
  ): Promise<Response> {
    const apiId = APIID.TEMPLATE_CREATE;
    const existingTemplate = await this.notificationTemplatesRepository.findOne(
      {
        where: { context: data.context, key: data.key },
      }
    );
    if (existingTemplate) {
      LoggerUtil.error(
        ERROR_MESSAGES.TEMPLATE_ALREADY_EXIST,
        ERROR_MESSAGES.NOT_FOUND,
        apiId,
        userId
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
    const notificationTemplateResult =
      await this.notificationTemplatesRepository.save(notificationTemplate);
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
        link: type === 'push' ? configData?.link || null : null,
      });
      return await this.notificationTemplateConfigRepository.save(
        templateConfig
      );
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
    LoggerUtil.log(
      SUCCESS_MESSAGES.TEMPLATE_CREATED_SUCESSFULLY(userId),
      apiId,
      userId
    );
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
    const existingTemplate = await this.notificationTemplatesRepository.findOne(
      {
        where: { actionId: id },
      }
    );
    if (!existingTemplate) {
      LoggerUtil.error(
        ERROR_MESSAGES.TEMPLATE_NOT_EXIST,
        ERROR_MESSAGES.NOT_FOUND,
        apiId,
        userId
      );
      throw new BadRequestException(ERROR_MESSAGES.TEMPLATE_NOT_EXIST);
    }
    //check key already exist for this context
    if (updateEventDto.key) {
      const checkKeyAlreadyExist =
        await this.notificationTemplatesRepository.findOne({
          where: { context: existingTemplate.context, key: updateEventDto.key },
        });
      if (checkKeyAlreadyExist) {
        LoggerUtil.error(
          ERROR_MESSAGES.ALREADY_EXIST_KEY_FOR_CONTEXT,
          ERROR_MESSAGES.INVALID_REQUEST,
          apiId,
          `${userId}`
        );
        throw new BadRequestException(
          ERROR_MESSAGES.ALREADY_EXIST_KEY_FOR_CONTEXT_ENTER_ANOTHER
        );
      }
    }

    Object.assign(existingTemplate, updateEventDto);

    const result = await this.notificationTemplatesRepository.save(
      existingTemplate
    );
    const createConfig = async (type: string, configData?: any) => {
      if (configData && Object.keys(configData).length > 0) {
        let existingConfig =
          await this.notificationTemplateConfigRepository.findOne({
            where: { actionId: id, type: type },
          });
        if (existingConfig) {
          Object.assign(existingConfig, configData);
          existingConfig.updatedBy = userId;
          return await this.notificationTemplateConfigRepository.save(
            existingConfig
          );
        } else {
          if (!configData.subject || !configData.body) {
            throw new BadRequestException(
              ERROR_MESSAGES.NOT_EMPTY_SUBJECT_OR_BODY
            );
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
            link: configData.link || null,
          });
          return await this.notificationTemplateConfigRepository.save(
            newConfig
          );
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
      let existingConfig = await this.notificationTemplateConfigRepository.find(
        {
          where: { actionId: id },
        }
      );
      existingConfig.forEach(async (config) => {
        if (updateEventDto.status) {
          config.status = updateEventDto.status;
          await this.notificationTemplateConfigRepository.save(config);
        }
      });
    }
    LoggerUtil.log(
      `Template updated successfully by userId: ${userId}`,
      apiId,
      userId
    );
    return response
      .status(HttpStatus.OK)
      .json(APIResponse.success(apiId, { id: id }, 'OK'));
  }

  async getTemplates(
    searchFilterDto: SearchFilterDto,
    userId: string,
    response: Response
  ) {
    const apiId = APIID.TEMPLATE_LIST;
    const { context, key, title } = searchFilterDto.filters;
    const { limit, offset } = searchFilterDto;

    let whereCondition: any = { context };
    if (key) {
      whereCondition.key = key;
    }
    if (title) {
      whereCondition.title = ILike(`%${title}%`);
    }

    // Build query options
    const queryOptions: any = {
      where: whereCondition,
      relations: ['templateconfig'],
    };

    // Add pagination if provided
    if (limit !== undefined) {
      queryOptions.take = limit;
    }
    if (offset !== undefined) {
      queryOptions.skip = offset;
    }

    // Get total count for pagination metadata
    const totalCount = await this.notificationTemplatesRepository.count({
      where: whereCondition,
    });

    const result = await this.notificationTemplatesRepository.find(queryOptions);

    // Only throw error if no results AND no pagination (meaning no filters matched)
    if (result.length === 0 && totalCount === 0) {
      throw new NotFoundException(ERROR_MESSAGES.TEMPLATE_NOTFOUND);
    }

    const finalResult = result.map((item) => {
      const { templateconfig, ...rest } = item;
      const formattedTemplateConfig = templateconfig.reduce((acc, config) => {
        const { type, language, subject, body, createdOn, image, link } =
          config;
        acc[type] = { language, subject, body, createdOn, image, link };
        return acc;
      }, {});
      return { ...rest, templates: formattedTemplateConfig };
    });

    // Prepare response with pagination metadata
    const responseData = {
      data: finalResult,
      pagination: {
        totalCount,
        limit: limit || null,
        offset: offset || 0,
        hasMore: limit ? (offset || 0) + limit < totalCount : false
      }
    };

    LoggerUtil.log(SUCCESS_MESSAGES.GET_TEMPLATE(userId), apiId, userId);
    return response
      .status(HttpStatus.OK)
      .json(APIResponse.success(apiId, responseData, 'OK'));
  }

  async deleteTemplate(actionId: number, userId: string, response: Response) {
    const apiId = APIID.TEMPLATE_DELETE;
    const templateId = await this.notificationTemplatesRepository.findOne({
      where: { actionId },
    });
    if (!templateId) {
      LoggerUtil.error(
        ERROR_MESSAGES.TEMPLATE_NOT_EXIST,
        ERROR_MESSAGES.NOT_FOUND,
        apiId,
        userId
      );
      throw new NotFoundException(
        ERROR_MESSAGES.TEMPLATE_ID_NOTFOUND(actionId)
      );
    }
    const deleteTemplate = await this.notificationTemplatesRepository.delete({
      actionId,
    });
    if (deleteTemplate.affected !== 1) {
      throw new BadRequestException(ERROR_MESSAGES.TEMPLATE_NOT_DELETED);
    }
    LoggerUtil.log(SUCCESS_MESSAGES.DELETE_TEMPLATE(userId), apiId, userId);
    return response
      .status(HttpStatus.OK)
      .json(APIResponse.success(apiId, { id: actionId }, 'OK'));
  }

  //update In both action and template table
  async updateNotificationAction(
    id: number,
    updateNotificationActionDto: UpdateNotificationActionDto,
    userId: string,
    response: Response
  ) {
    const apiId = APIID.TEMPLATE_UPDATE;

    // Check if NotificationActions record exists
    const existingAction = await this.notificationTemplatesRepository.findOne({
      where: { actionId: id },
    });

    if (!existingAction) {
      LoggerUtil.error(
        ERROR_MESSAGES.TEMPLATE_NOT_EXIST,
        ERROR_MESSAGES.NOT_FOUND,
        apiId,
        userId
      );
      throw new BadRequestException(ERROR_MESSAGES.TEMPLATE_NOT_EXIST);
    }

    // Update NotificationActions table fields
    const actionUpdates: any = {};
    if (updateNotificationActionDto.title) {
      actionUpdates.title = updateNotificationActionDto.title;
    }
    if (updateNotificationActionDto.status) {
      actionUpdates.status = updateNotificationActionDto.status;
    }
    actionUpdates.updatedBy = userId;

    if (Object.keys(actionUpdates).length > 0) {
      await this.notificationTemplatesRepository.update(id, actionUpdates);
    }

    // Helper function to update template by type
    const updateTemplateByType = async (type: string, configData: any) => {
      if (configData && Object.keys(configData).length > 0) {
        let existingConfig =
          await this.notificationTemplateConfigRepository.findOne({
            where: { actionId: id, type: type },
          });

        if (existingConfig) {
          // Update existing template
          Object.assign(existingConfig, configData);
          existingConfig.updatedBy = userId;
          if (updateNotificationActionDto.templateStatus) {
            existingConfig.status = updateNotificationActionDto.templateStatus;
          }
          return await this.notificationTemplateConfigRepository.save(
            existingConfig
          );
        } else {
          // Create new template if it doesn't exist
          if (!configData.subject || !configData.body) {
            throw new BadRequestException(
              ERROR_MESSAGES.NOT_EMPTY_SUBJECT_OR_BODY
            );
          }
          const newConfig = this.notificationTemplateConfigRepository.create({
            actionId: id,
            type: type,
            subject: configData.subject,
            body: configData.body,
            status:
              updateNotificationActionDto.templateStatus ||
              existingAction.status,
            language: 'en',
            updatedBy: userId,
            createdBy: userId,
            image: configData.image || null,
            link: configData.link || null,
            emailFromName: configData.emailFromName || null,
            emailFrom: configData.emailFrom || null,
          });
          return await this.notificationTemplateConfigRepository.save(
            newConfig
          );
        }
      }
    };

    // Update templates based on type
    if (
      updateNotificationActionDto.email &&
      Object.keys(updateNotificationActionDto.email).length > 0
    ) {
      await updateTemplateByType('email', updateNotificationActionDto.email);
    }

    if (
      updateNotificationActionDto.sms &&
      Object.keys(updateNotificationActionDto.sms).length > 0
    ) {
      await updateTemplateByType('sms', updateNotificationActionDto.sms);
    }

    if (
      updateNotificationActionDto.push &&
      Object.keys(updateNotificationActionDto.push).length > 0
    ) {
      await updateTemplateByType('push', updateNotificationActionDto.push);
    }

    // Update template status for all existing templates if templateStatus is provided
    if (updateNotificationActionDto.templateStatus) {
      let existingConfigs =
        await this.notificationTemplateConfigRepository.find({
          where: { actionId: id },
        });
      existingConfigs.forEach(async (config) => {
        config.status = updateNotificationActionDto.templateStatus;
        config.updatedBy = userId;
        await this.notificationTemplateConfigRepository.save(config);
      });
    }

    // Fetch the updated data from both tables
    const updatedAction = await this.notificationTemplatesRepository.findOne({
      where: { actionId: id },
      relations: ['templateconfig'],
    });

    if (!updatedAction) {
      throw new BadRequestException(
        'Failed to fetch updated notification action'
      );
    }

    // Format the response to include both tables data
    const { templateconfig, ...actionData } = updatedAction;
    const formattedTemplateConfig = templateconfig.reduce((acc, config) => {
      const {
        type,
        language,
        subject,
        body,
        createdOn,
        image,
        link,
        emailFromName,
        emailFrom,
        status,
      } = config;
      acc[type] = {
        language,
        subject,
        body,
        createdOn,
        image,
        link,
        emailFromName,
        emailFrom,
        status,
      };
      return acc;
    }, {});

    const responseData = {
      actionId: id,
      ...actionData,
      templates: formattedTemplateConfig,
    };

    LoggerUtil.log(
      `Notification action updated successfully by userId: ${userId}`,
      apiId,
      userId
    );

    return response
      .status(HttpStatus.OK)
      .json(
        APIResponse.success(
          apiId,
          responseData,
          'Notification action updated successfully'
        )
      );
  }

  async getActionDetails(
    actionId: number,
    userId: string,
    response: Response
  ): Promise<Response> {
    const apiId = APIID.ACTION_GET;

    // Find the action with its related templates
    const action = await this.notificationTemplatesRepository.findOne({
      where: { actionId },
      relations: ['templateconfig'],
    });

    if (!action) {
      LoggerUtil.error(
        ERROR_MESSAGES.TEMPLATE_NOT_EXIST,
        ERROR_MESSAGES.NOT_FOUND,
        apiId,
        userId
      );
      throw new NotFoundException(ERROR_MESSAGES.TEMPLATE_ID_NOTFOUND(actionId));
    }

    // Format the response to include both tables data
    const { templateconfig, ...actionData } = action;
    const formattedTemplateConfig = templateconfig.reduce((acc, config) => {
      const {
        templateId,
        type,
        language,
        subject,
        body,
        createdOn,
        updatedOn,
        status,
        image,
        link,
        emailFromName,
        emailFrom,
        createdBy,
        updatedBy,
      } = config;
      acc[type] = {
        templateId,
        language,
        subject,
        body,
        createdOn,
        updatedOn,
        status,
        image,
        link,
        emailFromName,
        emailFrom,
        createdBy,
        updatedBy,
      };
      return acc;
    }, {});

    const responseData = {
      ...actionData,
      templates: formattedTemplateConfig,
    };

    LoggerUtil.log(
      `Action details retrieved successfully for actionId: ${actionId} by userId: ${userId}`,
      apiId,
      userId
    );

    return response
      .status(HttpStatus.OK)
      .json(
        APIResponse.success(
          apiId,
          responseData,
          'Action details retrieved successfully'
        )
      );
  }

  getUserIdFromToken(token: string) {
    const payloadBase64 = token.split('.')[1]; // Get the payload part
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8'); // Decode Base64
    const payload = JSON.parse(payloadJson); // Convert to JSON
    return payload.sub;
  }
}
