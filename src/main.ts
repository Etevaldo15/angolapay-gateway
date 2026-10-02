import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('AngolaPay Gateway API')
    .setDescription(
      'API de integração de pagamentos enterprise com OAuth2 (Multicaixa Express, Referência, é-Kwanza)',
    )
    .setVersion('1.0')
    .addTag('Autenticação')
    .addTag('Comerciantes')
    .addTag('Pagamentos')
    .addTag('Webhooks')
    // 1. Adiciona suporte a Bearer Token (JWT) para rotas protegidas
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Insira o token JWT (ex: eyJhbGciOiJIUzI1NiIs...)',
        in: 'header',
      },
      'access-token',
    )
    // 2. Adiciona suporte à Admin API Key para gestão de comerciantes
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-admin-api-key',
        in: 'header',
        description: 'Chave de admin para criar/gerir comerciantes',
      },
      'admin-api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
  console.log(`📚 Swagger Documentation: http://localhost:3000/api/docs`);
}
bootstrap();
