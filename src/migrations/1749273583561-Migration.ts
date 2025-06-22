import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1749273583561 implements MigrationInterface {
    name = 'Migration1749273583561'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."messages_type_enum" AS ENUM('dm', 'comment', 'mention', 'reply')`);
        await queryRunner.query(`CREATE TYPE "public"."messages_priority_enum" AS ENUM('high', 'medium', 'low')`);
        await queryRunner.query(`CREATE TYPE "public"."messages_category_enum" AS ENUM('business', 'fan_question', 'collaboration', 'spam', 'general', 'urgent')`);
        await queryRunner.query(`CREATE TYPE "public"."messages_status_enum" AS ENUM('unread', 'read', 'replied', 'archived', 'flagged')`);
        await queryRunner.query(`CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "accountId" uuid NOT NULL, "platformMessageId" character varying NOT NULL, "type" "public"."messages_type_enum" NOT NULL, "content" text NOT NULL, "senderUsername" character varying NOT NULL, "senderDisplayName" character varying, "senderAvatar" character varying, "senderFollowersCount" integer, "priority" "public"."messages_priority_enum" NOT NULL DEFAULT 'medium', "category" "public"."messages_category_enum", "status" "public"."messages_status_enum" NOT NULL DEFAULT 'unread', "aiAnalysis" jsonb, "response" text, "respondedAt" TIMESTAMP, "autoReplied" boolean NOT NULL DEFAULT false, "metadata" jsonb, "receivedAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_592fbb867b65b9f9c0b1df1bf9" ON "messages" ("category", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_16ec702cf311f5fd6c02bc5076" ON "messages" ("status", "priority") `);
        await queryRunner.query(`CREATE INDEX "IDX_f944d630f562c754e14f2fe3cc" ON "messages" ("accountId", "createdAt") `);
        await queryRunner.query(`CREATE TYPE "public"."accounts_platform_enum" AS ENUM('instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'linkedin')`);
        await queryRunner.query(`CREATE TYPE "public"."accounts_status_enum" AS ENUM('connected', 'disconnected', 'error', 'expired')`);
        await queryRunner.query(`CREATE TABLE "accounts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" uuid NOT NULL, "platform" "public"."accounts_platform_enum" NOT NULL, "platformId" character varying NOT NULL, "username" character varying NOT NULL, "displayName" character varying, "avatar" character varying, "bio" character varying, "followersCount" integer NOT NULL DEFAULT '0', "followingCount" integer NOT NULL DEFAULT '0', "status" "public"."accounts_status_enum" NOT NULL DEFAULT 'connected', "accessToken" text, "refreshToken" text, "tokenExpiresAt" TIMESTAMP, "metadata" jsonb, "lastSyncAt" TIMESTAMP, "lastActivityAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7a0187de0a82f21cb4474f6634" ON "accounts" ("platformId", "platform") `);
        await queryRunner.query(`CREATE INDEX "IDX_abaabb0277a354f064fc828501" ON "accounts" ("userId", "platform") `);
        await queryRunner.query(`CREATE TYPE "public"."templates_type_enum" AS ENUM('auto_reply', 'quick_response', 'business_inquiry', 'fan_interaction', 'collaboration')`);
        await queryRunner.query(`CREATE TYPE "public"."templates_category_enum" AS ENUM('business', 'fan_question', 'collaboration', 'spam', 'general', 'urgent')`);
        await queryRunner.query(`CREATE TABLE "templates" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" uuid NOT NULL, "name" character varying NOT NULL, "description" text, "type" "public"."templates_type_enum" NOT NULL, "category" "public"."templates_category_enum", "content" text NOT NULL, "triggers" text, "variables" text, "isActive" boolean NOT NULL DEFAULT true, "isDefault" boolean NOT NULL DEFAULT false, "platforms" text, "conditions" jsonb, "usageCount" integer NOT NULL DEFAULT '0', "lastUsedAt" TIMESTAMP, "successRate" numeric(5,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_515948649ce0bbbe391de702ae5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c3fcdb7ea7c2d2ce60fff57a87" ON "templates" ("type", "isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_abbdda7a997874e6312c981a91" ON "templates" ("userId", "category") `);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('influencer', 'agency', 'admin')`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'suspended')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying NOT NULL, "password" character varying NOT NULL, "name" character varying NOT NULL, "avatar" character varying, "role" "public"."users_role_enum" NOT NULL DEFAULT 'influencer', "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "company" character varying, "website" character varying, "bio" character varying, "preferences" jsonb, "subscription" jsonb, "lastLoginAt" TIMESTAMP, "emailVerified" boolean NOT NULL DEFAULT false, "emailVerificationToken" character varying, "passwordResetToken" character varying, "passwordResetExpires" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_d6c1f7cf55771a368ac44b29218" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "accounts" ADD CONSTRAINT "FK_3aa23c0a6d107393e8b40e3e2a6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "templates" ADD CONSTRAINT "FK_7193babbf16087eb6107606dfe3" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "templates" DROP CONSTRAINT "FK_7193babbf16087eb6107606dfe3"`);
        await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT "FK_3aa23c0a6d107393e8b40e3e2a6"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_d6c1f7cf55771a368ac44b29218"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_abbdda7a997874e6312c981a91"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c3fcdb7ea7c2d2ce60fff57a87"`);
        await queryRunner.query(`DROP TABLE "templates"`);
        await queryRunner.query(`DROP TYPE "public"."templates_category_enum"`);
        await queryRunner.query(`DROP TYPE "public"."templates_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_abaabb0277a354f064fc828501"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7a0187de0a82f21cb4474f6634"`);
        await queryRunner.query(`DROP TABLE "accounts"`);
        await queryRunner.query(`DROP TYPE "public"."accounts_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."accounts_platform_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f944d630f562c754e14f2fe3cc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_16ec702cf311f5fd6c02bc5076"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_592fbb867b65b9f9c0b1df1bf9"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP TYPE "public"."messages_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."messages_category_enum"`);
        await queryRunner.query(`DROP TYPE "public"."messages_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."messages_type_enum"`);
    }

}
