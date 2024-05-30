import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class SubscribeToDeviceTopicDto {
    @ApiProperty({
        example: ['ftDBnZrETM7k1RYHCYG-UQN8MIIYKKco4X62hAbjBL',
            'fbudfjdjv48478cnxvcnvbjvffv-ddvv4']
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
