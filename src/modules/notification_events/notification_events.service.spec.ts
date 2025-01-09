import { Test, TestingModule } from '@nestjs/testing';
import { NotificationEventsService } from './notification_events.service';
import { TypeormService } from '../typeorm/typeorm.service';
import { Response } from 'express';
import { NotificationActions } from './entity/notificationActions.entity';
import * as dotenv from 'dotenv';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { NotificationActionTemplates } from './entity/notificationActionTemplates.entity';
import { EntityManager } from 'typeorm';
import { BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';
import { SearchFilterDto } from './dto/searchTemplateType.dto';
import { CreateEventDto } from './dto/createTemplate.dto';
import { UpdateEventDto } from './dto/updateEventTemplate.dto';
dotenv.config();


describe('NotificationEventsService', () => {
    let service: NotificationEventsService;
    let req: Request;
    let responseMock: Partial<Response>;

    beforeEach(async () => {
        responseMock = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        const module: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({ isGlobal: true }), // Ensure ConfigModule is loaded globally in tests
                TypeOrmModule.forRootAsync({
                    useFactory: async () => ({
                        type: "postgres",
                        host: process.env.POSTGRES_HOST,
                        port: parseInt(process.env.POSTGRES_PORT, 10),
                        username: process.env.POSTGRES_USERNAME,
                        password: process.env.POSTGRES_PASSWORD,
                        database: process.env.POSTGRES_DATABASE,
                        entities: [NotificationActions, NotificationActionTemplates],
                        synchronize: false, // Auto synchronize (use cautiously in production)
                    }),
                }),
                TypeOrmModule.forFeature([NotificationActionTemplates, NotificationActions]), // Register your repositories

            ],
            providers: [NotificationEventsService, TypeormService, EntityManager],
        }).compile();

        service = module.get<NotificationEventsService>(NotificationEventsService);
        const typeormService = module.get<TypeormService>(TypeormService);
        // Explicitly initialize TypeormService
        await typeormService.initialize();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('NotificationTemplate', () => {
        //error alrady exist tempate 
        // it('should throw an error if the template already exists', async () => {
        //     const userId = '3d7f0cb6-0dbd-4ae2-b937-61b9708baa0c';
        //     const data: CreateEventDto = {
        //         title: 'Test Template',
        //         key: 'TEST_KEY1',
        //         status: 'ACTIVE',
        //         context: 'TEST_CONTEXT',
        //         replacementTags: [
        //             { name: 'campaign.first_name', description: 'Name of Campaign Promoter' },
        //             { name: 'campaign.last_name', description: 'Last Name of Campaign Promoter' },
        //         ],
        //         email: { subject: 'Test Email Subject', body: 'Test Email Body' },
        //         push: { subject: 'Test Push Subject', body: 'Test Push Body', image: 'image.png', link: 'http://example.com' },
        //         sms: { subject: 'Test SMS Subject', body: 'Test SMS Body' },
        //     };


        //     const result = await service.createTemplate(userId, data, responseMock as Response);
        //     // Assert that the service throws a BadRequestException
        //     await expect(result).rejects.toThrow(
        //         new BadRequestException('Template with this context and key already exists.')
        //     );
        // });

        // create  if not exist template - Success
        // it('should successfully create a new template', async () => {
        //     const userId = '3d7f0cb6-0dbd-4ae2-b937-61b9708baa0c';
        //     const data: CreateEventDto = {
        //         title: 'Test Template',
        //         key: 'TEST_KEY',
        //         status: 'ACTIVE',
        //         context: 'TEST_CONTEXT',
        //         replacementTags: [
        //             { name: 'campaign.first_name', description: 'Name of Campaign Promoter' },
        //             { name: 'campaign.last_name', description: 'Last Name of Campaign Promoter' },
        //         ],
        //         email: { subject: 'Test Email Subject', body: 'Test Email Body' },
        //         push: { subject: 'Test Push Subject', body: 'Test Push Body', image: 'image.png', link: 'http://example.com' },
        //         sms: { subject: 'Test SMS Subject', body: 'Test SMS Body' },
        //     };

        //     const result = await service.createTemplate(userId, data, responseMock as Response);
        //     console.log(result, "result");
        //     expect(responseMock.status).toHaveBeenCalledWith(HttpStatus.CREATED);
        //     // expect(responseMock.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        // });

        // //Get API sucesss
        it("should fetch template", async () => {
            const searchFilterDto: SearchFilterDto = {
                filters: {
                    context: 'TEST',
                    key: ''
                }
            };
            const userId = '9991759f-e829-46f7-9350-68e11c8af2f2';

            const jsonSpy = jest.spyOn(responseMock, 'json').mockImplementation((result) => {
                return result; // Just return the result passed to json
            });
            await service.getTemplates(searchFilterDto, userId, responseMock as Response);
            const result = jsonSpy.mock.calls[0][0].result; // Get the result array from the json response
            expect(result.length).toBeGreaterThan(0); // Pass if result length is greater than 0
        });

        //getting error if template is not found
        it('should throw a NotFoundException if the template does not exist', async () => {
            await expect(
                service.deleteTemplate(1111, '3d7f0cb6-0dbd-4ae2-b937-61b9708baa0c', responseMock as Response)
            ).rejects.toThrow(new NotFoundException(`No template id found: 1111`));
        });

        //update API
        //error -> not exist acrtion id
        // it('should successfully update an existing template', async () => {
        //     const userId = '3d7f0cb6-0dbd-4ae2-b937-61b9708baa0c';
        //     const actionId = 1;
        //     const updateEventDto: UpdateEventDto = {
        //         title: 'Updated Template Title',
        //         key: 'UPDATED_KEY',
        //         status: 'INACTIVE',
        //         email: { subject: 'Updated Email Subject', body: 'Updated Email Body' },
        //         // push: { subject: 'Updated Push Subject', body: 'Updated Push Body', image: 'new-image.png', link: 'http://newlink.com' },
        //         // sms: { subject: 'Updated SMS Subject', body: 'Updated SMS Body' },
        //         updatedBy: '',
        //         replacementTags: []
        //     };
        //     // Execute the method
        //     await service.updateNotificationTemplate(actionId, updateEventDto, userId, responseMock as Response);
        //     // Assertions
        //     expect(responseMock.status).toHaveBeenCalledWith(HttpStatus.OK);
        // });

        //sucess mean existing actionId  -> Getting error now
        // it('should successfully update an existing template', async () => {
        //     const userId = '3d7f0cb6-0dbd-4ae2-b937-61b9708baa0c';
        //     const actionId = 75;
        //     const updateEventDto: UpdateEventDto = {
        //         title: 'Updated Template',
        //         status: 'INACTIVE',
        //         email: { subject: 'Updated Email Subject1', body: 'Updated Email Body' },
        //         updatedBy: '',
        //         replacementTags: [],
        //         key: ''
        //     };
        //     // Execute the method
        //     await service.updateNotificationTemplate(actionId, updateEventDto, userId, responseMock as Response);
        //     // Assertions
        //     expect(responseMock.status).toHaveBeenCalledWith(HttpStatus.OK);
        // });
    });
});
