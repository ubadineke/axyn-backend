import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateConversationMessagesTable1710000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'conversation_messages',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'user_id',
                        type: 'int',
                        isNullable: false,
                    },
                    {
                        name: 'agent_id',
                        type: 'int',
                        isNullable: false,
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['user', 'agent', 'payment', 'error', 'system'],
                        default: "'user'",
                    },
                    {
                        name: 'content',
                        type: 'text',
                        isNullable: false,
                    },
                    {
                        name: 'payment_amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 6,
                        isNullable: true,
                    },
                    {
                        name: 'payment_signature',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: true,
                    },
                ],
                indices: [
                    {
                        name: 'IDX_conversation_user_agent',
                        columnNames: ['user_id', 'agent_id', 'created_at'],
                    },
                    {
                        name: 'IDX_conversation_created_at',
                        columnNames: ['created_at'],
                    },
                ],
            }),
            true,
        );

        // Add foreign key constraints
        await queryRunner.createForeignKey(
            'conversation_messages',
            new TableForeignKey({
                columnNames: ['user_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'conversation_messages',
            new TableForeignKey({
                columnNames: ['agent_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'agents',
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('conversation_messages');
        if (table) {
            const foreignKeys = table.foreignKeys;
            for (const fk of foreignKeys) {
                await queryRunner.dropForeignKey('conversation_messages', fk);
            }
        }
        await queryRunner.dropTable('conversation_messages');
    }
}
