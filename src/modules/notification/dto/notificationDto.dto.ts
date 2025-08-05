import { IsString, IsEmail, IsArray, ValidateNested, IsObject, IsNotEmpty, ArrayMinSize, IsBoolean, IsOptional, IS_ARRAY } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

    @ApiProperty({ example: 'EVENT', description: 'Context of the notification' })
    @IsNotEmpty()
    @IsString()
    context: string;

    @ApiProperty({ example: 'OnAfterAttendeeEnrolled', description: 'Key of the notification' })
    @IsNotEmpty()
    @IsString()
    key: string;

    // @ApiProperty({ example: ['John Doe', 'How to use UI tools'] })
    // @IsOptional()
    // @IsArray()
    // @ArrayMinSize(1)
    // replacements: string[];
    @ApiPropertyOptional({
        description: 'Dynamic replacements for template tags',
        example: {
            "{eventName}": "How to use UI tools",
            "{userName}": "John Doe",
            "{courseTitle}": "How to use UI tools",
            "{contactEmail}": "support@example.com"
        }
    })
    @IsOptional()
    @IsObject()
    // @ValidateReplacement() // Custom decorator to ensure at least one replacement
    replacements?: { [key: string]: string };

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

export class RawEmailDto {
    @ApiProperty({ description: 'email recipients', example: 'user@example.com' })
    @IsNotEmpty()
    @IsArray()
    @IsEmail()
    to: string[];
  
    @ApiPropertyOptional({ description: 'Email sender address', example: 'noreply@company.com' })
    @IsOptional()
    @IsEmail()
    from?: string;
  
    @ApiProperty({ description: 'Email subject', example: 'Your account has been created' })
    @IsNotEmpty()
    @IsString()
    subject: string;
  
    @ApiProperty({ description: 'Email body (HTML or text)', example: '<p>Welcome to our service!</p>' })
    @IsNotEmpty()
    @IsString()
    body: string;
  
  }
  
  export class RawSmsDto {
    @ApiProperty({ description: 'Phone number of recipient', example: '+15551234567' })
    @IsNotEmpty()
    @IsArray()
    @IsString()
    to: string[];
  
    @ApiPropertyOptional({ description: 'SMS sender ID', example: 'COMPANY' })
    @IsOptional()
    @IsString()
    from?: string;
  
    @ApiProperty({ description: 'SMS message content', example: 'Your verification code is 123456' })
    @IsNotEmpty()
    @IsString()
    body: string;
  }

  export class RawWhatsappDto {
    @ApiProperty({ description: 'Phone numbers of recipients', example: ['919876543210'] })
    @IsNotEmpty()
    @IsArray()
    @IsString({each: true})
    to: string[];
  
    @ApiProperty({ description: 'Gupshup Template ID', example: 'a0c2we11-1ff1-411b-144a-11d61d9e73e0' })
    @IsNotEmpty()
    @IsString()
    templateId: string;
  
    @ApiProperty({ description: 'Template parameters', example: ['123456'] })
    @IsNotEmpty()
    @IsArray()
    templateParams: any[];

    @ApiProperty({ description: 'Gupshup Source', example: '919876543210' })
    @IsNotEmpty()
    @IsString()
    gupshupSource: string;

    @ApiProperty({ description: 'Gupshup API Key', example: 'your-api-key' })
    @IsNotEmpty()
    @IsString()
    gupshupApiKey: string;
  }
  
  export class RawNotificationDto {
    @ApiPropertyOptional({ description: 'Email notification details' })
    @IsOptional()
    @ValidateNested()
    @Type(() => RawEmailDto)
    email?: RawEmailDto;
  
    @ApiPropertyOptional({ description: 'SMS notification details' })
    @IsOptional()
    @ValidateNested()
    @Type(() => RawSmsDto)
    sms?: RawSmsDto;

    @ApiPropertyOptional({ description: 'WhatsApp notification details' })
    @IsOptional()
    @ValidateNested()
    @Type(() => RawWhatsappDto)
    whatsapp?: RawWhatsappDto;
  }



