import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTemplateConfigService } from './notification_template_config.service';

describe('NotificationTemplateConfigService', () => {
  let service: NotificationTemplateConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationTemplateConfigService],
    }).compile();

    service = module.get<NotificationTemplateConfigService>(NotificationTemplateConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
