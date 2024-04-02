import { Test, TestingModule } from '@nestjs/testing';
import { NotificationEventsController } from './notification_events.controller';

describe('NotificationEventsController', () => {
  let controller: NotificationEventsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationEventsController],
    }).compile();

    controller = module.get<NotificationEventsController>(NotificationEventsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
