import { IsBoolean, IsInt, IsOptional, IsString, IsDateString, IsNotEmpty } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class NotificationQueueDTO {

    id: string;

    @ApiProperty({ example: 'Email', description: 'Channel through which the notification is sent.' })
    @IsString()
    channel: string;

    @ApiProperty({ example: 'EVENT', description: 'Context of the notification.' })
    @IsString()
    @IsNotEmpty()
    context?: string;

    @ApiProperty({ example: '12345', description: 'ID related to the context.' })
    context_id?: number;

    @ApiProperty({ example: 'New Event', description: 'Subject of the notification.' })
    @IsString()
    subject?: string;

    @ApiProperty({ example: 'Hello, this is a notification.', description: 'Body content of the notification.' })
    @IsString()
    body?: string;

    @ApiProperty({ example: 'user@example.com', description: 'Recipient of the notification.' })
    @IsString()
    recipient?: string;

    // @ApiProperty({ example: '2024-04-10T12:00:00Z', description: 'Timestamp when the notification expires.' })
    // @IsDateString()
    // expiry?: Date;

    @ApiProperty({ example: 3, description: 'Number of retries attempted.' })
    @IsInt()
    retries?: number;

    // @ApiProperty({ example: '2024-04-02T10:00:00Z', description: 'Timestamp of the last attempted notification.' })
    // @IsString()
    // last_attempted: Date;

    @ApiProperty({ example: true, description: 'Status of the notification.' })
    @IsBoolean()
    status?: boolean;
}
