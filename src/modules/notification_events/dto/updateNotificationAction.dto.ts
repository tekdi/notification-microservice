import { ApiProperty } from "@nestjs/swagger";
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class EmailUpdateDto {
    @ApiProperty({ example: "Updated email subject", description: "Email subject" })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    subject: string;

    @ApiProperty({ example: "Updated email body content", description: "Email body" })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    body: string;

    @ApiProperty({ example: "Aspire Leaders", description: "Email from name" })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    emailFromName: string;

    @ApiProperty({ example: "noreply@aspireleaders.org", description: "Email from address" })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    emailFrom: string;
}

export class SmsUpdateDto {
    @ApiProperty({ example: "Updated SMS subject", description: "SMS subject" })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    subject: string;

    @ApiProperty({ example: "Updated SMS body content", description: "SMS body" })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    body: string;
}

export class PushUpdateDto {
    @ApiProperty({ example: "Updated push subject", description: "Push subject" })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    subject: string;

    @ApiProperty({ example: "Updated push body content", description: "Push body" })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    body: string;

    @ApiProperty({ example: "https://images.unsplash.com/photo-1519389950473-47ba0277781c", description: "Image URL" })
    @IsString()
    @IsOptional()
    image: string;

    @ApiProperty({ example: "https://aspireleaders.org/learn", description: "Link URL" })
    @IsString()
    @IsOptional()
    link: string;
}

export class UpdateNotificationActionDto {
    @ApiProperty({ example: "Updated notification title", description: "Notification title" })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    title: string;

    @ApiProperty({ example: "published", description: "Status for NotificationActions" })
    @IsEnum(['published', 'unpublished'], {
        message: 'Status must be one of: published, unpublished',
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    status: string;

    @ApiProperty({ example: "published", description: "Status for NotificationActionTemplates" })
    @IsEnum(['published', 'unpublished'], {
        message: 'Template status must be one of: published, unpublished',
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    templateStatus: string;

    @ApiProperty({ type: EmailUpdateDto, description: "Email update details" })
    @ValidateNested()
    @Type(() => EmailUpdateDto)
    @IsOptional()
    email?: EmailUpdateDto;

    @ApiProperty({ type: SmsUpdateDto, description: "SMS update details" })
    @ValidateNested()
    @Type(() => SmsUpdateDto)
    @IsOptional()
    sms?: SmsUpdateDto;

    @ApiProperty({ type: PushUpdateDto, description: "Push notification update details" })
    @ValidateNested()
    @Type(() => PushUpdateDto)
    @IsOptional()
    push?: PushUpdateDto;

    @ApiProperty({ example: "uuid-string", description: "Updated by user ID" })
    @IsUUID()
    @IsOptional()
    updatedBy: string;
}