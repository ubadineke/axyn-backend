import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddActivityFieldsToTransaction1731820541000
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'transactions',
            new TableColumn({
                name: 'userPrompt',
                type: 'text',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'transactions',
            new TableColumn({
                name: 'responseSummary',
                type: 'text',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'transactions',
            new TableColumn({
                name: 'activityType',
                type: 'varchar',
                length: '50',
                default: "'query'",
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('transactions', 'activityType');
        await queryRunner.dropColumn('transactions', 'responseSummary');
        await queryRunner.dropColumn('transactions', 'userPrompt');
    }
}
