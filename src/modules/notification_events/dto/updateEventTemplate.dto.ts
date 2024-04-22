import { ApiProperty } from "@nestjs/swagger";
import {
    ArrayNotEmpty,
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class EmailDto {
    @ApiProperty({ description: "Email subject", example: "This is new subject" })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    subject: string;

    @ApiProperty({ example: "This is body of Email", description: "Email body" })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    body: string;
}

export class PushNotificationDto {
    @ApiProperty({ description: "Subject", example: "This is push subject" })
    @IsNotEmpty()
    @IsString()
    @IsOptional()
    subject: string;

    @ApiProperty({ description: "Body", example: "This is body of Push" })
    @IsNotEmpty()
    @IsString()
    @IsOptional()
    body: string;
}

export class SMSNotificationDto {
    @ApiProperty({ description: "Subject", example: "This is SMS subject" })
    @IsNotEmpty()
    @IsString()
    @IsOptional()
    subject: string;

    @ApiProperty({ description: "Body", example: "This is body of SMS" })
    @IsNotEmpty()
    @IsString()
    @IsOptional()
    body: string;
}


export class UpdateEventDto {
    // @ApiProperty({ example: "EVENT" })
    // @IsString()
    // @IsNotEmpty()
    // @IsOptional()
    // context: string;

    @ApiProperty({ example: "This is title", description: "Event title" })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    title: string;

    @ApiProperty({ example: "OnAfterAttendeeEnrolled", description: "Event key" })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    key: string;

    @ApiProperty({
        description: "replacementTags",
        example: [
            {
                name: "campaign.first_name",
                description: "Name of Campaign Promoter",
            },
        ],
    })
    @ValidateNested({ each: true })
    @Type(() => ReplacementTagDto)
    @IsArray()
    @ArrayNotEmpty()
    @IsOptional()
    replacementTags: ReplacementTagDto[];

    @ApiProperty({ example: "en", description: "en" })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    language: string;

    @ApiProperty({ example: "published", description: "Status" })
    @IsEnum(['published', 'unpublished'], {
        message: 'Status must be one of: published, unpublished',
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    status: string;


    @ApiProperty({ type: EmailDto, description: "Email" })
    @ValidateNested({ each: true })
    @Type(() => EmailDto)
    @IsOptional()
    @IsNotEmpty()
    email?: EmailDto;

    @ApiProperty({ type: PushNotificationDto, description: "Push details" })
    @ValidateNested({ each: true })
    @Type(() => PushNotificationDto)
    @IsOptional()
    @IsNotEmpty()
    push?: PushNotificationDto;

    @ApiProperty({ type: SMSNotificationDto, description: "SMS details" })
    @ValidateNested({ each: true })
    @Type(() => SMSNotificationDto)
    @IsOptional()
    @IsNotEmpty()
    sms?: SMSNotificationDto;
}

export class ReplacementTagDto {
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    name: string;

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    description: string;
}