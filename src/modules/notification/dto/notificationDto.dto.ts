import { IsString, IsEmail, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class EmailDTO {

    @ApiProperty({ type: [String], example: ['email1@example.com'] })
    @IsEmail()
    @IsArray()
    recipients: string[];
}

export class SMSDTO {

    @ApiProperty({ type: [String], example: ['1234567890'] })
    @IsArray()
    @IsString({ each: true })
    recipients: string[];
}

export class PushDTO {

    @ApiProperty({ example: 'AAAAfzfFOMg:APA91bExdish2-dqVvVfcZetfpCqjVpOYv7-26J-dW9m1dKvMOIXlNhsx9_Guuxni_D9ppFiNVnxYd9hYBvyY94jLOlPwhlmyAlU9A-mUi3N3Sp35wjY6uRMJB8VNRJ7x-kxCzsZKrr2' })
    @IsString()
    sender_id: string;

    @ApiProperty({ example: 'eU6DfepmHcRyqBv4Bp2Izn:APA91bEzZrBsLta2LX9F732VH5vCs2TYnJBPnx755y1H5aiiS4bx1UxjuXxldF0YpbnRIF0rBW6SaygNaHyJ68-dZ8IO1hwqVmSiZKwng3OGmHblRSAuQP0vIXWdkrwf0b7Qz105EA3m' })
    @IsString()
    token: string;

    @ApiProperty({ example: 'Hi...', description: 'Push notification title' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'First Demo Push....', description: 'Push notification body' })
    @IsString()
    body: string;
}


export class NotificationDto {

    @ApiProperty({ example: 'EVENT', description: 'Context of the notification' })
    @IsString()
    context: string;

    @ApiProperty({
        example: { attendee: 'John Doe', event: 'How to use UI tools' },
        description: 'Replacements for placeholders in the notification context',
    })
    @IsObject()
    replacements: {
        attendee: string;
        event: string;
    };

    @ApiProperty({ type: EmailDTO, description: 'Email notification details' })
    @ValidateNested()
    @Type(() => EmailDTO)
    email: EmailDTO;

    @ApiProperty({ type: PushDTO, description: 'Push notification details' })
    @ValidateNested()
    @Type(() => PushDTO)
    push: PushDTO;

    @ApiProperty({ type: SMSDTO, description: 'SMS notification details' })
    @ValidateNested()
    @Type(() => SMSDTO)
    sms: SMSDTO;
}



