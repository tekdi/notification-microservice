import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    UnauthorizedException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response, Request } from 'express';
import APIResponse from '../utils/response';
import { ERROR_MESSAGES } from '../utils/constant.util';
import { LoggerUtil } from '../logger/LoggerUtil';
import { jwtDecode } from 'jwt-decode';

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
        // const authHeader = request.headers.
        //     authorization;

        // if (!authHeader?.startsWith('Bearer ')) {
        //     throw new UnauthorizedException("Invalid or missing token");
        // }

        // const token = authHeader.split(' ')[1]; // Extract JWT token
        // const decoded: any = jwtDecode(token); // Decode token

        // if (!decoded?.sub) {
        //     throw new UnauthorizedException("Token missing user identifier (sub)");
        // }
         // Only extract userId if authorization header exists
    let userId = 'unknown';
    const authHeader = request.headers.authorization;
    
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded: any = jwtDecode(token);
            userId = decoded?.sub || 'unknown';
        } catch (error) {
            // If token is invalid, just use 'unknown' for logging
            userId = 'unknown';
        }
    }

        // const userId = decoded.sub;

        const status =
            exception instanceof HttpException ? exception.getStatus() : 500;

        let errorMessage =
            exception?.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

        LoggerUtil.error(errorMessage, `Error occurred on API: ${request.url} Method : ${request.method}`, 'Notification Service', `requested by userId: ${userId}`,
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
                (exception as QueryFailedError).message,
                'Notification Service', `${userId}`)

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
