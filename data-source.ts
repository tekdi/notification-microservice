import 'dotenv/config';
import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';

// __dirname is the project root when this file runs via ts-node (local dev,
// npm run migration:*) and dist/ when it runs as compiled dist/data-source.js
// (production container start-up). Globbing {ts,js} from __dirname resolves to
// the right path either way, so migrations run correctly in both modes.
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
    join(__dirname, 'src/**/*.entity.{ts,js}'),
    join(__dirname, 'src/**/entity/*.entity.{ts,js}'),
    join(__dirname, 'src/modules/**/entity/*.entity.{ts,js}'),
  ],
  migrations: [join(__dirname, 'src/migrations/*.{ts,js}')],
});

export default AppDataSource;


