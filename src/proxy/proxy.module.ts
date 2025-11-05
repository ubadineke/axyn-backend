import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';
import { X402Guard } from './guards/x402.guard';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Agent } from '../agent/entities/agent.entity';
import { Transaction } from '../transaction/entities/transaction.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Agent, Transaction]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '7d' },
            }),
        }),
    ],
    controllers: [ProxyController],
    providers: [ProxyService, AuthGuard, X402Guard],
    exports: [ProxyService],
})
export class ProxyModule {
    // Note: x402 payment protection is applied via X402Guard in controller
    // This allows dynamic pricing per agent
}
