import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTemplateConfigController } from './notification_template_config.controller';

describe('NotificationTemplateConfigController', () => {
  let controller: NotificationTemplateConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationTemplateConfigController],
    }).compile();

    controller = module.get<NotificationTemplateConfigController>(NotificationTemplateConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
