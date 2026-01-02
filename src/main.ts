import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { RequestMethod } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.setGlobalPrefix("notification/v1", {
  //   exclude: [
  //     { path: "health", method: RequestMethod.GET },
  //     { path: "health/live", method: RequestMethod.GET },
  //     { path: "health/ready", method: RequestMethod.GET },
  //   ],
  // });

  const config = new DocumentBuilder()
    .setTitle('Notification')
    .setDescription('The Notification API description')
    .addApiKey(
      { type: 'apiKey', name: 'Authorization', in: 'header' },
      'access-token'
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/swagger-docs', app, document);
  app.enableCors();
  
  // Use environment variable for port, default to 4001
  const port = process.env.PORT || 4001;
  await app.listen(port);
  console.log(`Application is running on port: ${port}`);
}
bootstrap();
