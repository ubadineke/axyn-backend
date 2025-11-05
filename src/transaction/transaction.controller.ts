import {
    Controller,
    Post,
    Get,
    Body,
    UseGuards,
    Request,
    Param,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { RecordTransactionDto } from './dto/record-transaction.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('transaction')
export class TransactionController {
    constructor(private readonly transactionService: TransactionService) { }

    @Post()
    @UseGuards(AuthGuard)
    async recordTransaction(
        @Request() req,
        @Body() dto: RecordTransactionDto,
    ) {
        const userId = req.user.sub;
        console.log('[TransactionController] Recording transaction for user:', userId);
        return this.transactionService.recordTransaction(userId, dto);
    }

    @Get('my-transactions')
    @UseGuards(AuthGuard)
    async getMyTransactions(@Request() req) {
        const userId = req.user.sub;
        console.log('[TransactionController] Fetching transactions for user:', userId);
        return this.transactionService.getUserTransactions(userId);
    }

    @Get('my-hired-agents')
    @UseGuards(AuthGuard)
    async getMyHiredAgents(@Request() req) {
        const userId = req.user.sub;
        console.log('[TransactionController] Fetching hired agents for user:', userId);
        return this.transactionService.getUserHiredAgents(userId);
    }

    @Get('agent/:id')
    @UseGuards(AuthGuard)
    async getAgentTransactions(@Param('id') agentId: string) {
        console.log('[TransactionController] Fetching transactions for agent:', agentId);
        return this.transactionService.getAgentTransactions(+agentId);
    }

    @Get('check/:agentId')
    @UseGuards(AuthGuard)
    async checkPayment(@Request() req, @Param('agentId') agentId: string) {
        const userId = req.user.sub;
        const hasPaid = await this.transactionService.hasUserPaidAgent(userId, +agentId);
        return { hasPaid };
    }
}
