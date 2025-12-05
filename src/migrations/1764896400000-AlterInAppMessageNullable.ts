import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterInAppMessageNullable1764896400000 implements MigrationInterface {
    name = 'AlterInAppMessageNullable1764896400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE public."notificationInApp"
            ALTER COLUMN message DROP NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Caution: setting NOT NULL may fail if nulls exist; sanitize by replacing nulls with empty string first
        await queryRunner.query(`
            UPDATE public."notificationInApp" SET message = '' WHERE message IS NULL
        `);
        await queryRunner.query(`
            ALTER TABLE public."notificationInApp"
            ALTER COLUMN message SET NOT NULL
        `);
    }
}


