import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@nestjs-plus/rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        RabbitMQModule.forRootAsync({
            useFactory: () => ({
                exchanges: [
                    { name: 'notification.exchange', type: 'direct' },
                ],
                // exchanges: [
                //   { name: 'notification.exchange', type: 'direct' },
                // ],
                // queues: [
                //   { name: 'notification.queue', options: { durable: true } },
                // ],
                // bindings: [
                //   { exchange: 'notification.exchange', queue: 'notification.queue', routingKey: 'notification.route' },
                // ],
                uri: 'amqp://localhost:5672',
            }),
        }),
    ],
    exports: [RabbitMQModule],
})


@Module({})
export class RabbitmqModule { }
