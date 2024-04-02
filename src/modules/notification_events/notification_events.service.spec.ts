import { Test, TestingModule } from '@nestjs/testing';
import { NotificationEventsService } from './notification_events.service';

describe('NotificationEventsService', () => {
  let service: NotificationEventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationEventsService],
    }).compile();

    service = module.get<NotificationEventsService>(NotificationEventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
