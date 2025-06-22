import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAgentAndTrainingSession1750578121594 implements MigrationInterface {
    name = 'CreateAgentAndTrainingSession1750578121594'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."training_sessions_status_enum" AS ENUM('active', 'completed', 'archived')`);
        await queryRunner.query(`CREATE TABLE "training_sessions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "agentId" uuid NOT NULL, "title" character varying, "status" "public"."training_sessions_status_enum" NOT NULL DEFAULT 'active', "messages" jsonb NOT NULL, "analysis" jsonb, "lastMessageAt" TIMESTAMP, "completedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6678399f77ed9db5176459befa9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c2d45689f72a7380147974c02b" ON "training_sessions" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_00377c9acf7ea3026887511e20" ON "training_sessions" ("agentId") `);
        await queryRunner.query(`CREATE TYPE "public"."agents_status_enum" AS ENUM('active', 'inactive', 'training')`);
        await queryRunner.query(`CREATE TABLE "agents" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" uuid NOT NULL, "name" character varying NOT NULL, "description" text NOT NULL, "systemPrompt" text, "status" "public"."agents_status_enum" NOT NULL DEFAULT 'training', "trainingData" jsonb, "metadata" jsonb, "assignedAccountId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1ea6b2ce044724d3254d19ab92" ON "agents" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_f535e5b2c0f0dc7b7fc656ebc9" ON "agents" ("userId") `);
        await queryRunner.query(`ALTER TABLE "training_sessions" ADD CONSTRAINT "FK_00377c9acf7ea3026887511e208" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agents" ADD CONSTRAINT "FK_f535e5b2c0f0dc7b7fc656ebc91" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agents" ADD CONSTRAINT "FK_dcefc4cd68928b846172a92548b" FOREIGN KEY ("assignedAccountId") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agents" DROP CONSTRAINT "FK_dcefc4cd68928b846172a92548b"`);
        await queryRunner.query(`ALTER TABLE "agents" DROP CONSTRAINT "FK_f535e5b2c0f0dc7b7fc656ebc91"`);
        await queryRunner.query(`ALTER TABLE "training_sessions" DROP CONSTRAINT "FK_00377c9acf7ea3026887511e208"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f535e5b2c0f0dc7b7fc656ebc9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1ea6b2ce044724d3254d19ab92"`);
        await queryRunner.query(`DROP TABLE "agents"`);
        await queryRunner.query(`DROP TYPE "public"."agents_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_00377c9acf7ea3026887511e20"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c2d45689f72a7380147974c02b"`);
        await queryRunner.query(`DROP TABLE "training_sessions"`);
        await queryRunner.query(`DROP TYPE "public"."training_sessions_status_enum"`);
    }

}
