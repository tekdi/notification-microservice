import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@nestjs-plus/rabbitmq';
import { ConfigService } from '@nestjs/config';

@Module({
    imports: [
        RabbitMQModule.forRootAsync({
            useFactory: async (configService: ConfigService) => ({
                exchanges: [
                    { name: 'notification.exchange', type: 'direct' },
                ],
                uri: configService.get<string>('RABBITMQ_URL'),
            }),
            inject: [ConfigService],
        }),
    ],
    exports: [RabbitMQModule],
})


@Module({})
export class RabbitmqModule { }
