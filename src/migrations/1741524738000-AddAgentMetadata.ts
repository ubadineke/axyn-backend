import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAgentMetadata1741524738000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'agents',
            new TableColumn({
                name: 'metadata',
                type: 'jsonb',
                isNullable: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('agents', 'metadata');
    }
}
