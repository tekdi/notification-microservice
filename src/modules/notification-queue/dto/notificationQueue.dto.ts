import { IsBoolean, IsInt, IsOptional, IsString, IsDateString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class NotificationQueueDTO {

    id: string;

    @IsString()
    channel: string;

    @IsString()
    context?: string;

    @IsString()
    context_id?: string;

    @IsString()
    subject?: string;

    @IsOptional()
    @IsString()
    body?: string;


    @IsString()
    recipient?: string;

    @IsString()
    createdOn: string;

    @IsDateString()
    expiry?: Date;

    @IsInt()
    @IsDateString()
    retries?: number;

    @IsString()
    last_attempted: Date;


    @IsBoolean()
    status?: boolean;
}
