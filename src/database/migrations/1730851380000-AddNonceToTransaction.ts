import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNonceToTransaction1730851380000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add nonce column for replay attack prevention
        await queryRunner.addColumn(
            'transactions',
            new TableColumn({
                name: 'nonce',
                type: 'varchar',
                length: '255',
                isNullable: true,
                isUnique: true,
            })
        );

        // Create index for faster nonce lookups
        await queryRunner.query(`
            CREATE INDEX "IDX_transactions_nonce" ON "transactions" ("nonce")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index first
        await queryRunner.query(`DROP INDEX "IDX_transactions_nonce"`);

        // Drop column
        await queryRunner.dropColumn('transactions', 'nonce');
    }
}
