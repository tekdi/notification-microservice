import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response, Request } from 'express';
import APIResponse from '../utils/response';
import { ERROR_MESSAGES } from '../utils/constant.util';
import { LoggerUtil } from '../logger/LoggerUtil';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(private readonly apiId?: string) { }

    catch(
        exception: Error | HttpException | QueryFailedError,
        host: ArgumentsHost,
    ) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const userId = request?.query?.userId;
        const status =
            exception instanceof HttpException ? exception.getStatus() : 500;

        let errorMessage =
            exception?.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

        LoggerUtil.error(`Error occurred on API: ${request.url} Method : ${request.method}`,
            errorMessage, 'Notification Service', `requested by userId: ${userId}`,
        )

        if (exception instanceof HttpException) {
            const statusCode = exception.getStatus();
            const errorResponse = APIResponse.error(
                this.apiId,
                (exception.getResponse() as any)?.message,
                ERROR_MESSAGES.BAD_REQUEST,
                statusCode.toString(),
            );
            return response.status(statusCode).json(errorResponse);
        } else if (exception instanceof QueryFailedError) {
            const statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
            const errorResponse = APIResponse.error(
                this.apiId,
                (exception as QueryFailedError).message,
                ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
                statusCode.toString(),
            );
            LoggerUtil.error(`Database Query Failed on API: ${request.url} requested by userId: ${userId}`,
                request.method,
                (exception as QueryFailedError).message,
                'QueryFailedError')

            return response.status(statusCode).json(errorResponse);
        }
        const detailedErrorMessage = `${errorMessage}`;

        const errorResponse = APIResponse.error(
            this.apiId,
            detailedErrorMessage,
            exception instanceof HttpException
                ? exception.name
                : ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
            status.toString(),
        );
        return response.status(status).json(errorResponse);
    }
}
