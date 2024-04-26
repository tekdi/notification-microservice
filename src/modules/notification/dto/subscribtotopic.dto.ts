import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class SubscribeToDeviceTopicDto {
    @ApiProperty({
        example: ['ftDBnZrEThexwyEIEHmOt5:APA91bFbQvEfIQrEJUT8pNKizLAvj2OLBqXz2W9hNuS8SRm222otM7k1RYHCYG-UQN8MIIYKKco4X62hTmzL2ZDeerEabLNdsVARMGuGTYyfuD5MQyV6iR0Hucq5FIViVxyFurKAbjBL',
            'cjKYKKZ2Q-KSSXCIFNPlC3:APA91bGc6Gb6YU9btjWtpgeLmPzoPoYDbY70m803enHmA_sRouSUEvjJGvdiQWk3KYOv_m1UVnl414MKqKi6PSJxTFH0jFFcRw3897JFJV76jxMftv-GqM1Q7gUtUoR9yGsdS8vEOeCf']
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsNotEmpty()
    deviceId: string[];

    @ApiProperty({ example: 'test2' })
    @IsString()
    @IsNotEmpty()
    topicName: string;
}
