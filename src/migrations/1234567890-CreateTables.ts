import { MigrationInterface, QueryRunner } from "typeorm"

export class CreateTables1234567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "user" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                // ... other columns
                CONSTRAINT "PK_user" PRIMARY KEY ("id")
            )
        `);
       
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user"`);
       
    }
} 