import { MiddlewareConsumer, Module, RequestMethod } from "@nestjs/common";
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
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RabbitmqModule,
    NotificationEventsModule,
    NotificationModule,
    NotificationQueueModule,
    RolePermissionModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, ConfigService],
})
export class AppModule {
  // configure(consumer: MiddlewareConsumer) {
  //   consumer
  //     .apply(PermissionMiddleware)
  //     .exclude(
  //       {
  //         path: "notification/v1/role-permission/create",
  //         method: RequestMethod.POST,
  //       }, // Exclude POST /auth/login
  //       {
  //         path: "notification/v1/role-permission/get",
  //         method: RequestMethod.POST,
  //       }, // Exclude POST /auth/login
  //       {
  //         path: "notification/v1/role-permission/update",
  //         method: RequestMethod.POST,
  //       } // Exclude POST /auth/login
  //       // Exclude GET /health
  //     )
  //     .forRoutes("*"); // Apply middleware to the all routes
  // }
}
