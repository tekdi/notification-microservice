import { MiddlewareConsumer, Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { NotificationEventsModule } from "./modules/notification_events/notification_events.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { DatabaseModule } from "./common/database-modules";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { NotificationQueueModule } from "./modules/notification-queue/notificationQueue.module";
import { RabbitmqModule } from "./modules/rabbitmq/rabbitmq.module";
import { PermissionMiddleware } from "./middleware/permission.middleware";
import { RolePermissionModule } from "./modules/permissionRbac/rolePermissionMapping/role-permission.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RabbitmqModule,
    NotificationEventsModule,
    NotificationModule,
    NotificationQueueModule,
    RolePermissionModule,
  ],
  controllers: [AppController],
  providers: [AppService, ConfigService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PermissionMiddleware).forRoutes("*"); // Apply middleware to the all routes
  }
}
