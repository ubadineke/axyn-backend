import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { Transaction } from './entities/transaction.entity';
import { AgentModule } from '../agent/agent.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Transaction]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '30d' },
            }),
            inject: [ConfigService],
        }),
        AgentModule,
    ],
    controllers: [TransactionController],
    providers: [TransactionService],
    exports: [TransactionService],
})
export class TransactionModule { }
