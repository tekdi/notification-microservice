import { IsString, IsNotEmpty, IsBoolean, IsEnum } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class SearchQueueDTO {

    @ApiProperty({ example: 'Email', description: 'Channel through which the notification is sent.' })
    @IsString()
    @IsNotEmpty()
    @IsEnum(['Email', 'sms', 'push', 'web', 'whatsapp'], {
        message: 'channel Type must be one of: Email, sms, push, web, whatsapp'
    }
    )
    channel: string;

    @ApiProperty({ example: 'EVENT', description: 'Context of the notification.' })
    @IsString()
    @IsNotEmpty()
    context?: string;

    @ApiProperty({ example: true, description: 'Status of the notification.' })
    @IsBoolean()
    status?: boolean;
}