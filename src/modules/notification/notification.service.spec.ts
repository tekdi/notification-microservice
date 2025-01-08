
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationActions } from '../notification_events/entity/notificationActions.entity';
import { NotificationActionTemplates } from '../notification_events/entity/notificationActionTemplates.entity';
import { NotificationQueue } from '../notification-queue/entities/notificationQueue.entity';
import { NotificationLog } from './entity/notificationLogs.entity';
import { TypeormService } from '../typeorm/typeorm.service';
import { EntityManager } from 'typeorm';
import { Response } from 'express';
import * as dotenv from 'dotenv';
import { NotificationQueueService } from '../notification-queue/notificationQueue.service';
import { AmqpConnection } from '@nestjs-plus/rabbitmq';
import { NotificationAdapterFactory } from './notificationadapters';
import { EmailAdapter } from './adapters/emailService.adapter';
import { SmsAdapter } from './adapters/smsService.adapter';
import { PushAdapter } from './adapters/pushService.adapter';
import { EmailDTO, NotificationDto, PushDTO, SMSDTO } from './dto/notificationDto.dto';
import { BadRequestException, HttpStatus } from '@nestjs/common';
dotenv.config();

describe('NotificationService', () => {
    let service: NotificationService;
    let responseMock: Partial<Response>;
    let mockAmqpConnection: Partial<AmqpConnection>
    beforeEach(async () => {
        responseMock = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockAmqpConnection = {
            publish: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({ isGlobal: true }),
                TypeOrmModule.forRootAsync({
                    useFactory: async () => ({
                        type: "postgres",
                        host: process.env.POSTGRES_HOST,
                        port: parseInt(process.env.POSTGRES_PORT, 10),
                        username: process.env.POSTGRES_USERNAME,
                        password: process.env.POSTGRES_PASSWORD,
                        database: process.env.POSTGRES_DATABASE,
                        entities: [NotificationActions, NotificationActionTemplates, NotificationLog, NotificationQueue],
                        synchronize: false, // Auto synchronize (use cautiously in production)
                    }),
                }),
                TypeOrmModule.forFeature([NotificationActionTemplates, NotificationActions, NotificationLog, NotificationQueue]), // Register your repositories
            ],
            providers: [NotificationService, TypeormService, EntityManager, NotificationQueueService, ConfigService, AmqpConnection, NotificationAdapterFactory, EmailAdapter, SmsAdapter, PushAdapter, {
                provide: AmqpConnection,
                useValue: mockAmqpConnection,
            },],
        }).compile();
        service = module.get<NotificationService>(NotificationService);
        const typeormService = module.get<TypeormService>(TypeormService);
        // Explicitly initialize TypeormService
        await typeormService.initialize();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    //error when template is not found for send notification
    // it('should throw BadRequestException when notification template is not found', async () => {
    //     const userId = '6e828f36-0d53-4f62-b34c-8a94e165ceed';
    //     const notificationDto: NotificationDto = {
    //         isQueue: false,
    //         context: 'TEST_CONTEXT1',
    //         key: 'TEST_KEY1',
    //         replacements: {
    //         },
    //         email: {
    //             receipients: ["example@example.com"],
    //         },
    //         push: new PushDTO,
    //         sms: new SMSDTO
    //     };
    //     // Mock any dependencies required by the service
    //     // jest.spyOn(service['typeormService'], 'findOne').mockResolvedValue(null);

    //     // Assert that the method throws the expected exception
    //     await expect(service.sendNotification(notificationDto, userId, responseMock as Response))
    //         .rejects.toThrow(new BadRequestException('Template not found'));
    //     // expect(service['typeormService'].findOne).toHaveBeenCalledWith(
    //     //     NotificationActions,
    //     //     { where: { context: 'TEST_CONTEXT1', key: 'TEST_KEY1' } }
    //     // );
    // });
    // //sucess
    it('should send email notification successfully and return expected response structure', async () => {
        const userId = '6e828f36-0d53-4f62-b34c-8a94e165ceed';
        const notificationDto: NotificationDto = {
            isQueue: false,
            context: 'TEST_CONTEXT',
            key: 'TEST_KEY',
            replacements: {
                '{programName}': 'Event Reminder',
                '{username}': 'John Doe'
            },
            email: {
                receipients: ["example@example.com"],
            },
            push: new PushDTO,
            sms: new SMSDTO
        };

        const jsonSpy = jest.spyOn(responseMock, 'json').mockImplementation((result) => {
            return result; // Just return the result passed to json
        });
        await service.sendNotification(notificationDto, userId, responseMock as Response);

        const status = jest.spyOn(responseMock, 'status').mockReturnThis();
        const result = jsonSpy.mock.calls[0][0].result;
        expect(status).toHaveBeenCalledWith(HttpStatus.OK);
        expect(result).toEqual({
            email: {
                data: [
                    {
                        recipient: "example@example.com",
                        result: 'Email notification sent successfully',
                        status: 200,
                    },
                ],
                errors: [],
            },
        });
    });
    // //sucess
    // it('should send Push notification successfully and return expected response structure', async () => {
    //     const userId = '6e828f36-0d53-4f62-b34c-8a94e165ceed';
    //     const notificationDto: NotificationDto = {
    //         isQueue: false,
    //         context: 'TEST_CONTEXT',
    //         key: 'TEST_KEY',
    //         replacements: {
    //             '{programName}': 'Event Reminder',
    //             '{username}': 'John Doe'
    //         },
    //         push: {
    //             receipients: ['fcmDeviceId123:APA91bGfEXAMPLEr123EXAMPLEoHuEXAMPLE'],
    //         },
    //         email: new EmailDTO,
    //         sms: new SMSDTO
    //     };

    //     const jsonSpy = jest.spyOn(responseMock, 'json').mockImplementation((result) => {
    //         return result; // Just return the result passed to json
    //     });
    //     await service.sendNotification(notificationDto, userId, responseMock as Response);
    //     const status = jest.spyOn(responseMock, 'status').mockReturnThis();
    //     const result = jsonSpy.mock.calls[0][0].result;
    //     expect(status).toHaveBeenCalledWith(HttpStatus.OK);
    //     expect(result).toEqual({
    //         push: {
    //             data: [
    //                 {
    //                     recipient: 'fcmDeviceId123:APA91bGfEXAMPLEr123EXAMPLEoHuEXAMPLE',
    //                     status: 200,
    //                     result: 'Push notification sent successfully',
    //                 },
    //             ],
    //             errors: [],
    //         },
    //     });
    // });
    // //sucess
    // it('should send SMS notification successfully and return expected response structure', async () => {
    //     const userId = '6e828f36-0d53-4f62-b34c-8a94e165ceed';
    //     const notificationDto: NotificationDto = {
    //         isQueue: false,
    //         context: 'TEST_CONTEXT',
    //         key: 'TEST_KEY',
    //         replacements: {
    //             '{otp}': '4444',
    //             '{otpExpiry}': '10MIN'
    //         },
    //         sms: {
    //             receipients: ['9876543210'],
    //         },
    //         email: new EmailDTO,
    //         push: new PushDTO
    //     };

    //     const jsonSpy = jest.spyOn(responseMock, 'json').mockImplementation((result) => {
    //         return result; // Just return the result passed to json
    //     });
    //     await service.sendNotification(notificationDto, userId, responseMock as Response);
    //     const status = jest.spyOn(responseMock, 'status').mockReturnThis();
    //     const result = jsonSpy.mock.calls[0][0].result;
    //     expect(status).toHaveBeenCalledWith(HttpStatus.OK);
    //     // Use toEqual or toMatchObject to verify the structure
    //     expect(result).toEqual({
    //         sms: {
    //             data: [
    //                 {
    //                     recipient: '9876543210',
    //                     status: 200,
    //                     result: 'SMS notification sent successfully',
    //                 },
    //             ],
    //             errors: [],
    //         },
    //     });
    // });

    // send all three notification -> sucess
    // it('should process multiple notification types (email, SMS, push) simultaneously', async () => {
    //     const userId = '6e828f36-0d53-4f62-b34c-8a94e165ceed';
    //     const notificationDto: NotificationDto = {
    //         isQueue: false,
    //         context: 'TEST_CONTEXT',
    //         key: 'TEST_KEY',
    //         replacements: {
    //             '{otp}': '4444',
    //             '{otpExpiry}': '10MIN'
    //         },
    //         sms: {
    //             receipients: ['9876543210'],
    //         },
    //         email: {
    //             receipients: [
    //                 "example@example.com",
    //             ]
    //         },
    //         push: {
    //             receipients: [
    //                 "fcmDeviceId123:APA91bGfEXAMPLEr123EXAMPLEoHuEXAMPLE"
    //             ]
    //         }
    //     };
    //     const jsonSpy = jest.spyOn(responseMock, 'json').mockImplementation((result) => {
    //         return result; // Just return the result passed to json
    //     });
    //     await service.sendNotification(notificationDto, userId, responseMock as Response);
    //     const status = jest.spyOn(responseMock, 'status').mockReturnThis();
    //     const result = jsonSpy.mock.calls[0][0].result;
    //     expect(status).toHaveBeenCalledWith(HttpStatus.OK);
    //     expect(result).toEqual({
    //         sms: {
    //             data: [
    //                 {
    //                     recipient: '9876543210',
    //                     status: 200,
    //                     result: 'SMS notification sent successfully',
    //                 },
    //             ],
    //             errors: [],
    //         },
    //         email: {
    //             data: [
    //                 {
    //                     recipient: "example@example.com",
    //                     status: 200,
    //                     result: 'Email notification sent successfully',
    //                 },
    //             ],
    //             errors: [],
    //         },
    //         push: {
    //             data: [
    //                 {
    //                     recipient: "fcmDeviceId123:APA91bGfEXAMPLEr123EXAMPLEoHuEXAMPLE",
    //                     status: 200,
    //                     result: 'Push notification sent successfully',
    //                 },
    //             ],
    //             errors: [],
    //         },
    //     });
    // });

    //test case for occure one sucess for one notification and error for another notification
    // it('should filter out channels with no data or errors in the final response', async () => {
    //     const userId = '6e828f36-0d53-4f62-b34c-8a94e165ceed';
    //     const notificationDto: NotificationDto = {
    //         isQueue: false,
    //         context: 'TEST_CONTEXT',
    //         key: 'TEST_KEY',
    //         replacements: {
    //             '{otp}': '4444',
    //             '{otpExpiry}': '10MIN'
    //         },
    //         email: {
    //             receipients: ["example@example.com"],
    //         },
    //         push: {
    //             receipients: [
    //                 "fcmDeviceId123:APA91bGfEXAMPLEr123EXAMPLEoHuEXAMPLE"
    //             ]
    //         },
    //         sms: new SMSDTO,
    //     };
    //     const jsonSpy = jest.spyOn(responseMock, 'json').mockImplementation((result) => {
    //         return result; // Just return the result passed to json
    //     });
    //     await service.sendNotification(notificationDto, userId, responseMock as Response);
    //     const status = jest.spyOn(responseMock, 'status').mockReturnThis();
    //     const result = jsonSpy.mock.calls[0][0].result;

    //     expect(status).toHaveBeenCalledWith(HttpStatus.OK);
    //     // Use toEqual or toMatchObject to verify the structure
    //     expect(result).toEqual({
    //         email: {
    //             data: [
    //                 {
    //                     recipient: "example@example.com",
    //                     status: 200,
    //                     result: 'Email notification sent successfully',
    //                 },
    //             ],
    //             errors: [],
    //         },
    //         push: {
    //             data: [
    //             ],
    //             errors: [
    //                 {
    //                     "recipient":  "fcmDeviceId123:APA91bGfEXAMPLEr123EXAMPLEoHuEXAMPLE",
    //                     "error": "AxiosError: Request failed with status code 400",
    //                     "code": "error"
    //                 }
    //             ],
    //         },
    //     });
    // });

    //getting error need to resolve not able to send notification  -> rabbitmq error
    // it('should return appropriate response structure when isQueue is true', async () => {
    //     const userId = '6e828f36-0d53-4f62-b34c-8a94e165ceed';
    //     const notificationDto: NotificationDto = {
    //         isQueue: true,
    //         context: 'TEST_CONTEXT',
    //         key: 'TEST_KEY',
    //         replacements: {
    //             "{learnerName}": "xyz"
    //         },
    //         email: {
    //             receipients: ["example@example.com"],
    //         },
    //         push: new PushDTO,
    //         sms: new SMSDTO
    //     };

    //     const jsonSpy = jest.spyOn(responseMock, 'json').mockImplementation((result) => {
    //         return result; // Just return the result passed to json
    //     });
    //     await service.sendNotification(notificationDto, userId, responseMock as Response);
    //     const status = jest.spyOn(responseMock, 'status').mockReturnThis();
    //     const result = jsonSpy.mock.calls[0][0].result;
    //     expect(status).toHaveBeenCalledWith(HttpStatus.OK);
    //     expect(result).toEqual({
    //         email: {
    //             data: [
    //                 {
    //                     status: 200,
    //                     message: "Notification saved in queue successfully"
    //                 }
    //             ],
    //             errors: [],
    //         },
    //     });
    // });
});
