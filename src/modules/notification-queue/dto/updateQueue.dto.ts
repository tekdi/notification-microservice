import { IsBoolean, IsInt, IsOptional, IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateQueueDTO {


    @ApiProperty({ example: 'New Event', description: 'Subject of the notification.' })
    @IsString()
    @IsOptional()
    subject?: string;

    @ApiProperty({ example: 'Hello, this is a notification.', description: 'Body content of the notification.' })
    @IsString()
    @IsOptional()
    body?: string;


    @ApiProperty({ example: '2024-04-10T12:00:00Z', description: 'Timestamp when the notification expires.' })
    @IsDateString()
    @IsOptional()
    expiry?: Date;

    @ApiProperty({ example: 3, description: 'Number of retries attempted.' })
    @IsInt()
    @IsOptional()
    retries?: number;

    @ApiProperty({ example: '2024-04-02T10:00:00Z', description: 'Timestamp of the last attempted notification.' })
    @IsString()
    @IsOptional()
    last_attempted: Date;

    @ApiProperty({ example: false, description: 'Status of the notification.' })
    @IsBoolean()
    @IsOptional()
    status?: boolean;
}
