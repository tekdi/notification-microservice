import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class TopicNotification {

    @ApiProperty({ example: 'test2' })
    @IsNotEmpty()
    @IsString()
    topic_name: string;

    @ApiProperty({ example: 'Hi...', description: 'Push notification title' })
    @IsNotEmpty()
    @IsString()
    title: string;

    @ApiProperty({ example: 'First Demo Push....', description: 'Push notification body' })
    @IsNotEmpty()
    @IsString()
    body: string;

    @ApiProperty({ example: 'https://picsum.photos/200', description: 'image' })
    @IsNotEmpty()
    @IsString()
    image: string;

    @ApiProperty({ example: 'https://google.com/', description: 'navigation link' })
    @IsNotEmpty()
    @IsString()
    navigate_to: string;

}