import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInAppNotification1764892800000 implements MigrationInterface {
    name = 'CreateInAppNotification1764892800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS public."notificationInApp" (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id uuid NOT NULL,
                template_id uuid,
                context varchar(255),
                action_key varchar(255),
                action_id integer,
                tenant_code varchar(255),
                org_code varchar(255),
                title varchar(255) NOT NULL,
                message text NOT NULL,
                link varchar(500),
                metadata jsonb,
                template_params jsonb,
                is_read boolean NOT NULL DEFAULT false,
                created_at timestamptz NOT NULL DEFAULT now(),
                read_at timestamptz,
                expires_at timestamptz,
                source varchar(100)
            );
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_inapp_user_created ON public."notificationInApp" (user_id, created_at DESC);
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_inapp_user_isread_created ON public."notificationInApp" (user_id, is_read, created_at DESC);
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_inapp_expires_at ON public."notificationInApp" (expires_at);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_inapp_expires_at;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_inapp_user_isread_created;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_inapp_user_created;`);
        await queryRunner.query(`DROP TABLE IF EXISTS public."notificationInApp";`);
    }
}


