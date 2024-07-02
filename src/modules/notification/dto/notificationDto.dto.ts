import { IsString, IsEmail, IsArray, ValidateNested, IsObject, IsNotEmpty, ArrayMinSize, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class EmailDTO {

    @ApiProperty({ example: ['email1@example.com'] })
    @IsArray()
    @IsNotEmpty()
    @ArrayMinSize(1)
    receipients: string[];
}

export class SMSDTO {

    @ApiProperty({ type: [String], example: ['1234567890'] })
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    @IsNotEmpty()
    receipients: string[];
}

export class PushDTO {

    @ApiProperty({ type: [String], example: ['d2ihU3WpBFeoeXWhXe03F5:APA91bFNTnRzqffOGjKWHMypfjHxH-H1tSO7-7V-eajz0YsomuA-mMDni4l9GAgR-ybrMh-g1fy6hVOknr0ThOBb7ttb_qnciS5hdsTQ8oPHjZLsa66kOLdzM9hiZJf1Iav9b0EvXTt4'] })
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    @IsNotEmpty()
    receipients: string[];
}


export class NotificationDto {

    @ApiProperty({ example: false, description: 'Define the way where we need to send notification ' })
    @IsNotEmpty()
    @IsBoolean()
    isQueue: boolean;

    @ApiProperty({ example: 'EVENT2', description: 'Context of the notification' })
    @IsNotEmpty()
    @IsString()
    context: string;

    @ApiProperty({ example: ['John Doe', 'How to use UI tools'] })
    @IsNotEmpty()
    @IsArray()
    @IsString({ each: true })
    replacements: string[];

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



