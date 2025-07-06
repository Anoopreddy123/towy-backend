"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTables1234567890 = void 0;
class CreateTables1234567890 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "user" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                // ... other columns
                CONSTRAINT "PK_user" PRIMARY KEY ("id")
            )
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "user"`);
    }
}
exports.CreateTables1234567890 = CreateTables1234567890;
