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

    @ApiProperty({ description: "Email subject", example: 'New Event' })
    @IsString()
    @IsNotEmpty()
    subject: string;

    @ApiProperty({ example: 'This is body of {#var0#} Notification', description: "Email body" })
    @IsString()
    @IsNotEmpty()
    body: string;

}

export class PushNotificationDto {

    @ApiProperty({ description: 'Subject', example: 'New Event' })
    @IsNotEmpty()
    @IsString()
    subject: string;

    @ApiProperty({ description: 'Body', example: 'This is body of Push' })
    @IsNotEmpty()
    @IsString()
    body: string;

    @ApiProperty({ description: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?fit=crop&w=800&h=600', example: 'This is image of Push' })
    @IsOptional()
    @IsString()
    image: string;

    @ApiProperty({ description: 'link', example: 'This is navigate link of Push' })
    @IsOptional()
    @IsString()
    link: string;

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


export class CreateEventDto {

    @ApiProperty({ example: "EVENT" })
    @IsString()
    @IsNotEmpty()
    context: string;


    @ApiProperty({ example: 'This is title', description: "Event title" })
    @IsString()
    @IsNotEmpty()
    title: string;


    @ApiProperty({ example: 'OnAfterAttendeeEnrolled', description: "Event key" })
    @IsString()
    @IsNotEmpty()
    key: string;

    @ApiProperty({ example: 'published', description: "Status" })
    @IsEnum(['published', 'unpublished'], {
        message: 'Status must be one of: published, unpublished',
    })
    @IsString()
    @IsNotEmpty()
    status?: string;

    @ApiProperty({
        description: 'replacementTags',
        example: [{
            "name": "campaign.first_name",
            "description": "Name of Campaign Promoter"
        }]
    })
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => ReplacementTagDto)
    @IsArray()
    @ArrayNotEmpty()
    replacementTags: ReplacementTagDto[];

    @ApiProperty({ type: EmailDto, description: "Email" })
    @ValidateNested({ each: true })
    @Type(() => EmailDto)
    @IsOptional()
    @IsNotEmpty()
    email: EmailDto;

    @ApiProperty({ type: PushNotificationDto, description: "Push details" })
    @ValidateNested({ each: true })
    @Type(() => PushNotificationDto)
    @IsOptional()
    @IsNotEmpty()
    push: PushNotificationDto;

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
    name: string;

    @IsString()
    @IsNotEmpty()
    description: string;
}