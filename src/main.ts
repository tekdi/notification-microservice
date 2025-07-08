import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { RequestMethod } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.setGlobalPrefix("notification/v1", {
  //   exclude: [{ path: "health", method: RequestMethod.GET }],
  // });

  const config = new DocumentBuilder()
    .setTitle('Notification')
    .setDescription('The Notification API description')
    .addApiKey(
      { type: 'apiKey', name: 'Authorization', in: 'header' },
      'access-token',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/swagger-docs", app, document);
  app.enableCors();
  await app.listen(4000);
}
bootstrap();
