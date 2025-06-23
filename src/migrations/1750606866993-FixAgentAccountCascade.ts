import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAgentAccountCascade1750606866993 implements MigrationInterface {
    name = 'FixAgentAccountCascade1750606866993'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agents" DROP CONSTRAINT "FK_dcefc4cd68928b846172a92548b"`);
        await queryRunner.query(`ALTER TABLE "agents" ADD CONSTRAINT "FK_dcefc4cd68928b846172a92548b" FOREIGN KEY ("assignedAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agents" DROP CONSTRAINT "FK_dcefc4cd68928b846172a92548b"`);
        await queryRunner.query(`ALTER TABLE "agents" ADD CONSTRAINT "FK_dcefc4cd68928b846172a92548b" FOREIGN KEY ("assignedAccountId") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
