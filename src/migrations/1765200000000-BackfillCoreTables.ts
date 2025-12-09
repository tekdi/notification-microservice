import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillCoreTables1765200000000 implements MigrationInterface {
  name = 'BackfillCoreTables1765200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // NotificationActions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "NotificationActions" (
        "actionId" SERIAL PRIMARY KEY,
        "title" varchar NOT NULL,
        "key" varchar NOT NULL,
        "status" varchar NOT NULL,
        "createdBy" uuid NOT NULL,
        "updatedBy" uuid,
        "context" varchar NOT NULL,
        "replacementTags" jsonb,
        "createdOn" timestamp NOT NULL DEFAULT now(),
        "updatedOn" timestamp NOT NULL DEFAULT now()
      );
    `);

    // NotificationActionTemplates
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "NotificationActionTemplates" (
        "templateId" uuid PRIMARY KEY,
        "actionId" integer NOT NULL,
        "language" varchar NOT NULL,
        "subject" varchar NOT NULL,
        "body" varchar NOT NULL,
        "createdOn" timestamp NOT NULL DEFAULT now(),
        "updatedOn" timestamp NOT NULL DEFAULT now(),
        "status" varchar NOT NULL,
        "type" varchar NOT NULL,
        "createdBy" uuid NOT NULL,
        "updatedBy" uuid,
        "image" varchar,
        "link" varchar
      );
    `);

    // NotificationQueue
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "NotificationQueue" (
        "id" uuid PRIMARY KEY,
        "channel" varchar,
        "context" varchar,
        "subject" varchar,
        "body" varchar,
        "recipient" varchar,
        "expiry" timestamptz,
        "retries" integer DEFAULT 0,
        "last_attempted" timestamptz,
        "status" boolean DEFAULT false,
        "context_id" integer,
        "createdOn" timestamptz DEFAULT now()
      );
    `);

    // RolePermission
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "RolePermission" (
        "rolePermissionId" uuid PRIMARY KEY,
        "module" varchar NOT NULL,
        "apiPath" varchar NOT NULL,
        "roleTitle" varchar NOT NULL,
        "requestType" varchar[] NOT NULL,
        "createdAt" timestamptz,
        "updatedAt" timestamptz,
        "createdBy" uuid,
        "updatedBy" uuid
      );
    `);

    // rolepermissionmapping
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rolepermissionmapping" (
        "role_title" varchar NOT NULL,
        "permission_id" varchar NOT NULL,
        "module" varchar NOT NULL,
        "request_type" varchar[] NOT NULL,
        "api_path" varchar NOT NULL,
        "created_by" varchar NOT NULL
      );
    `);

    // notificationLogs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notificationLogs" (
        "id" uuid PRIMARY KEY,
        "status" boolean NOT NULL DEFAULT false,
        "createdOn" timestamptz NOT NULL DEFAULT now(),
        "context" varchar(255),
        "action" varchar(255),
        "subject" varchar(255),
        "body" varchar,
        "type" varchar(255),
        "recipient" varchar(255),
        "error" varchar(255)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down is conservative: do not drop existing tables to avoid data loss
    // If needed, uncomment lines below.
    // await queryRunner.query('DROP TABLE IF EXISTS "notificationLogs";');
    // await queryRunner.query('DROP TABLE IF EXISTS "rolepermissionmapping";');
    // await queryRunner.query('DROP TABLE IF EXISTS "RolePermission";');
    // await queryRunner.query('DROP TABLE IF EXISTS "NotificationQueue";');
    // await queryRunner.query('DROP TABLE IF EXISTS "NotificationActionTemplates";');
    // await queryRunner.query('DROP TABLE IF EXISTS "NotificationActions";');
  }
}


