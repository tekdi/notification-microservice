import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT || 5432),
  username: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
  synchronize: false,
  logging: false,
  entities: [
    'src/**/*.entity.ts',
    'src/**/entity/*.entity.ts',
    'src/modules/**/entity/*.entity.ts',
  ],
  migrations: ['src/migrations/*.ts'],
});

export default AppDataSource;


