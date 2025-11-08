import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Connection, PublicKey } from '@solana/web3.js';
import { Transaction } from '../../transaction/entities/transaction.entity';

/**
 * Payment Verification Service
 * 
 * Implements industry-standard x402 payment verification following Corbits best practices.
 * 
 * Verification Process:
 * 1. Validate signature format
 * 2. Check nonce hasn't been used (replay attack prevention)
 * 3. Ensure signature hasn't been used (double-spend prevention)
 * 4. Wait for signature confirmation on-chain
 * 5. Fetch transaction from Solana RPC
 * 6. Verify transaction succeeded (no errors)
 * 7. Extract SPL token transfer details
 * 8. Verify correct token (USDC mint)
 * 9. Verify correct recipient (platform wallet)
 * 10. Verify amount matches requirement (with ±1% tolerance)
 * 11. Store nonce and transaction signature to prevent replay
 * 
 * Edge Cases Handled:
 * - Network congestion (transaction not yet confirmed)
 * - Multiple token transfers in same transaction (find correct one)
 * - Associated Token Account creation + transfer
 * - Amount rounding differences
 * - Signature format validation
 * - RPC timeout/errors
 * - Duplicate nonce attempts
 */
@Injectable()
export class PaymentVerificationService {
    private readonly logger = new Logger(PaymentVerificationService.name);
    private readonly connection: Connection;
    private readonly platformWallet: PublicKey;
    private readonly usdcMint: PublicKey;

    // Solana mainnet USDC mint
    private readonly USDC_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    // Verification constants
    private readonly AMOUNT_TOLERANCE = 0.01; // 1% tolerance for rounding
    private readonly MAX_CONFIRMATION_WAIT_MS = 30000; // 30 seconds
    private readonly TRANSACTION_FETCH_MAX_ATTEMPTS = 12;
    private readonly TRANSACTION_FETCH_DELAY_MS = 1500;
    private readonly SIGNATURE_STATUS_MAX_ATTEMPTS = 20;
    private readonly SIGNATURE_STATUS_DELAY_MS = 1500;

    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
        private readonly configService: ConfigService,
    ) {
        // Initialize Solana connection
        const rpcUrl = this.configService.get<string>('SOLANA_RPC_URL');
        const network = this.configService.get<string>('SOLANA_NETWORK') || 'devnet';

        if (!rpcUrl) {
            throw new Error('SOLANA_RPC_URL not configured');
        }

        this.connection = new Connection(rpcUrl, {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: this.MAX_CONFIRMATION_WAIT_MS,
        });

        // Initialize platform wallet
        const platformWalletAddress = this.configService.get<string>('PLATFORM_WALLET_ADDRESS');
        if (!platformWalletAddress) {
            throw new Error('PLATFORM_WALLET_ADDRESS not configured');
        }
        this.platformWallet = new PublicKey(platformWalletAddress);

        // Initialize USDC mint based on network
        const usdcMintAddress = this.configService.get<string>('USDC_MINT_ADDRESS');
        if (!usdcMintAddress) {
            throw new Error('USDC_MINT_ADDRESS not configured');
        }
        this.usdcMint = new PublicKey(usdcMintAddress);

        this.logger.log(`Payment verification initialized`);
        this.logger.log(`Network: ${network}`);
        this.logger.log(`Platform wallet: ${this.platformWallet.toBase58()}`);
        this.logger.log(`USDC mint: ${this.usdcMint.toBase58()}`);
        this.logger.log(`RPC endpoint: ${rpcUrl}`);
    }

    /**
     * Verify a payment transaction
     * 
     * @param signature - Solana transaction signature
     * @param nonce - Unique payment nonce
     * @param expectedAmount - Expected payment amount in USDC base units (lamports)
     * @param userId - User making the payment
     * @param agentId - Agent being paid for
     * @returns Verification result with details
     */
    async verifyPayment(params: {
        signature: string;
        nonce: string;
        expectedAmount: number;
        userId: number;
        agentId: number;
    }): Promise<{
        verified: boolean;
        reason?: string;
        transaction?: Transaction;
    }> {
        const { signature, nonce, expectedAmount, userId, agentId } = params;

        this.logger.log(`[VerifyPayment] Starting verification`);
        this.logger.log(`  Signature: ${signature}`);
        this.logger.log(`  Nonce: ${nonce}`);
        this.logger.log(`  Expected: ${expectedAmount} lamports (${expectedAmount / 1_000_000} USDC)`);

        try {
            // Step 1: Validate signature format
            if (!this.isValidSignature(signature)) {
                this.logger.warn(`[VerifyPayment] Invalid signature format`);
                return { verified: false, reason: 'Invalid signature format' };
            }

            // Step 2: Check nonce hasn't been used (replay attack prevention)
            const nonceUsed = await this.isNonceUsed(nonce);
            if (nonceUsed) {
                this.logger.warn(`[VerifyPayment] Nonce already used: ${nonce}`);
                return { verified: false, reason: 'Payment nonce already used (replay attack)' };
            }

            // Step 3: Check signature hasn't been used (double-spend prevention)
            const signatureUsed = await this.isSignatureUsed(signature);
            if (signatureUsed) {
                this.logger.warn(`[VerifyPayment] Signature already used: ${signature}`);
                return { verified: false, reason: 'Transaction signature already used' };
            }

            // Step 4: Wait for signature confirmation to avoid race conditions
            const signatureConfirmed = await this.waitForSignatureConfirmation(signature);
            if (!signatureConfirmed) {
                this.logger.warn(`[VerifyPayment] Signature not confirmed within expected timeframe - attempting direct RPC fetch`);
            }

            // Step 5: Fetch transaction from Solana (with retries for recent signatures)
            this.logger.log(`[VerifyPayment] Fetching transaction from Solana...`);
            const txResponse = await this.fetchTransactionWithRetry(signature);

            if (!txResponse) {
                this.logger.warn(`[VerifyPayment] Transaction not found on-chain`);
                return {
                    verified: false,
                    reason: signatureConfirmed
                        ? 'Transaction not found (may not be confirmed yet)'
                        : 'Transaction not confirmed on-chain yet',
                };
            }

            // Step 6: Verify transaction succeeded
            if (txResponse.meta?.err) {
                this.logger.error(`[VerifyPayment] Transaction failed:`, txResponse.meta.err);
                return { verified: false, reason: 'Transaction failed on-chain' };
            }

            // Step 7: Extract transfer from token balance changes
            // Note: Using getTransaction (not getParsedTransaction) for better RPC compatibility
            this.logger.log(`[VerifyPayment] Extracting transfer from token balances...`);
            const transferInfo = this.extractTransferFromTokenBalances(txResponse);

            if (!transferInfo) {
                this.logger.warn(`[VerifyPayment] Unable to determine USDC transfer details from transaction`);
                return { verified: false, reason: 'No token transfer instruction found' };
            }

            this.logger.log(`[VerifyPayment] Found transfer:`);
            this.logger.log(`  Amount: ${transferInfo.amount} lamports`);
            this.logger.log(`  Mint: ${transferInfo.mint}`);
            this.logger.log(`  Recipient ATA: ${transferInfo.destination}`);
            if (transferInfo.owner) {
                this.logger.log(`  Recipient Owner: ${transferInfo.owner}`);
            }

            // Step 8: Verify token mint is USDC
            if (transferInfo.mint !== this.usdcMint.toBase58()) {
                this.logger.warn(`[VerifyPayment] Wrong token mint: ${transferInfo.mint}`);
                return {
                    verified: false,
                    reason: `Wrong token (expected USDC: ${this.usdcMint.toBase58()})`
                };
            }

            // Step 9: Verify recipient is platform wallet or its ATA
            let isCorrectRecipient = false;

            // Fast-path: trust token balance owner if it matches expected wallet
            if (transferInfo.owner === this.platformWallet.toBase58()) {
                isCorrectRecipient = true;
            } else if (transferInfo.destination === this.platformWallet.toBase58()) {
                // Some envs may provide the platform ATA directly; accept exact match
                isCorrectRecipient = true;
            } else {
                isCorrectRecipient = await this.verifyRecipient(transferInfo.destination, transferInfo.owner);
            }

            if (!isCorrectRecipient) {
                this.logger.warn(`[VerifyPayment] Wrong recipient: ${transferInfo.destination}`);
                return {
                    verified: false,
                    reason: `Wrong recipient (expected: ${this.platformWallet.toBase58()})`
                };
            }

            // Step 10: Verify amount matches expected (with tolerance)
            const amountMatch = this.verifyAmount(transferInfo.amount, expectedAmount);
            if (!amountMatch) {
                this.logger.warn(`[VerifyPayment] Amount mismatch: ${transferInfo.amount} vs ${expectedAmount}`);
                return {
                    verified: false,
                    reason: `Insufficient payment (sent: ${transferInfo.amount}, required: ${expectedAmount})`
                };
            }

            // Step 11: Record transaction to prevent replay
            this.logger.log(`[VerifyPayment] ✅ Payment verified - recording transaction`);
            const transaction = await this.recordTransaction({
                signature,
                nonce,
                amount: expectedAmount / 1_000_000, // Convert to USD
                userId,
                agentId,
            });

            this.logger.log(`[VerifyPayment] ✅ Payment verification complete`);
            return { verified: true, transaction };

        } catch (error) {
            this.logger.error(`[VerifyPayment] Error during verification:`, error.message);

            // Handle specific RPC errors
            if (error.message?.includes('timeout') || error.message?.includes('429')) {
                return {
                    verified: false,
                    reason: 'RPC timeout - transaction may still be pending'
                };
            }

            return { verified: false, reason: `Verification error: ${error.message}` };
        }
    }

    private async fetchTransactionWithRetry(signature: string): Promise<any | null> {
        for (let attempt = 1; attempt <= this.TRANSACTION_FETCH_MAX_ATTEMPTS; attempt++) {
            const txResponse = await this.connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
            });

            if (txResponse) {
                if (!txResponse.meta?.err) {
                    return txResponse;
                }
                return txResponse; // surface failure meta to caller
            }

            if (attempt < this.TRANSACTION_FETCH_MAX_ATTEMPTS) {
                this.logger.warn(`[VerifyPayment] Transaction not found yet (attempt ${attempt}/${this.TRANSACTION_FETCH_MAX_ATTEMPTS}). Waiting ${this.TRANSACTION_FETCH_DELAY_MS}ms...`);
                await this.delay(this.TRANSACTION_FETCH_DELAY_MS);
            }
        }

        return null;
    }

    private async delay(ms: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, ms));
    }

    private async waitForSignatureConfirmation(signature: string): Promise<boolean> {
        for (let attempt = 1; attempt <= this.SIGNATURE_STATUS_MAX_ATTEMPTS; attempt++) {
            const statusResponse = await this.connection.getSignatureStatuses([signature], {
                searchTransactionHistory: true,
            });

            const status = statusResponse?.value?.[0];

            if (status?.err) {
                this.logger.error(`[VerifyPayment] Signature status reported error`, status.err);
                return false;
            }

            const confirmationStatus = status?.confirmationStatus;
            const confirmations = status?.confirmations;

            const isConfirmed = confirmationStatus === 'confirmed' || confirmationStatus === 'finalized' || (confirmations !== null && confirmations !== undefined && confirmations >= 1);

            if (isConfirmed) {
                return true;
            }

            if (attempt < this.SIGNATURE_STATUS_MAX_ATTEMPTS) {
                this.logger.warn(`[VerifyPayment] Signature not yet confirmed (attempt ${attempt}/${this.SIGNATURE_STATUS_MAX_ATTEMPTS}). Waiting ${this.SIGNATURE_STATUS_DELAY_MS}ms...`);
                await this.delay(this.SIGNATURE_STATUS_DELAY_MS);
            }
        }

        return false;
    }

    /**
     * Validate Solana signature format
     */
    private isValidSignature(signature: string): boolean {
        // Solana signatures are base58 encoded, typically 87-88 characters
        if (!signature || typeof signature !== 'string') {
            return false;
        }

        // Check length (base58 signatures are 87-88 chars)
        if (signature.length < 80 || signature.length > 90) {
            return false;
        }

        // Check for valid base58 characters
        const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
        return base58Regex.test(signature);
    }

    /**
     * Check if nonce has been used (replay prevention)
     */
    private async isNonceUsed(nonce: string): Promise<boolean> {
        const existingTx = await this.transactionRepository.findOne({
            where: { nonce },
        });
        return !!existingTx;
    }

    /**
     * Check if signature has been used (double-spend prevention)
     */
    private async isSignatureUsed(signature: string): Promise<boolean> {
        const existingTx = await this.transactionRepository.findOne({
            where: { signature },
        });
        return !!existingTx;
    }

    /**
     * Extract transfer from token balance deltas.
     * Uses getTransaction (not getParsedTransaction) for broad RPC compatibility.
     */
    private extractTransferFromTokenBalances(txResponse: any): {
        amount: number;
        mint: string;
        destination: string;
        owner?: string;
    } | null {
        const meta = txResponse.meta;
        if (!meta) {
            return null;
        }

        const postTokenBalances = meta.postTokenBalances ?? [];
        const preTokenBalances = meta.preTokenBalances ?? [];

        // Locate platform wallet balance entry
        const platformEntry = postTokenBalances.find((balance: any) =>
            balance.mint === this.usdcMint.toBase58() &&
            balance.owner === this.platformWallet.toBase58(),
        );

        if (!platformEntry) {
            return null;
        }

        const accountIndex = platformEntry.accountIndex;
        const accountKeyEntry = txResponse.transaction.message.accountKeys[accountIndex];
        const destinationAta = typeof accountKeyEntry === 'string'
            ? accountKeyEntry
            : accountKeyEntry?.pubkey ?? platformEntry.account ?? this.platformWallet.toBase58();

        const postAmount = BigInt(platformEntry.uiTokenAmount?.amount ?? '0');
        const preEntry = preTokenBalances.find((balance: any) => balance.accountIndex === accountIndex);
        const preAmount = BigInt(preEntry?.uiTokenAmount?.amount ?? '0');

        if (postAmount <= preAmount) {
            return null;
        }

        const amountDelta = postAmount - preAmount;

        return {
            amount: Number(amountDelta),
            mint: platformEntry.mint,
            destination: destinationAta,
            owner: platformEntry.owner,
        };
    }

    /**
     * Verify recipient is platform wallet's ATA
     */
    private async verifyRecipient(destinationAta: string, ownerHint?: string | null): Promise<boolean> {
        try {
            // If the token balance metadata already reports the expected owner, trust it.
            if (ownerHint && ownerHint === this.platformWallet.toBase58()) {
                return true;
            }

            if (destinationAta === this.platformWallet.toBase58()) {
                return true;
            }

            // The destination should be the platform wallet's USDC ATA
            // We'll verify by checking the ATA owner
            const ataInfo = await this.connection.getParsedAccountInfo(
                new PublicKey(destinationAta)
            );

            if (!ataInfo?.value?.data) {
                return false;
            }

            const data = ataInfo.value.data as any;
            const owner = data.parsed?.info?.owner;

            if (owner === this.platformWallet.toBase58()) {
                return true;
            }

            this.logger.warn(
                `[VerifyRecipient] ATA owner mismatch. owner=${owner ?? 'unknown'} expected=${this.platformWallet.toBase58()}`,
            );
            return false;
        } catch (error) {
            this.logger.error(`[VerifyRecipient] Error:`, error.message);
            return false;
        }
    }

    /**
     * Verify amount matches expected (with tolerance for rounding)
     */
    private verifyAmount(actualAmount: number, expectedAmount: number): boolean {
        // Allow 1% tolerance for rounding differences
        const minAmount = expectedAmount * (1 - this.AMOUNT_TOLERANCE);
        const maxAmount = expectedAmount * (1 + this.AMOUNT_TOLERANCE);

        return actualAmount >= minAmount && actualAmount <= maxAmount;
    }

    /**
     * Record verified transaction in database
     */
    private async recordTransaction(params: {
        signature: string;
        nonce: string;
        amount: number;
        userId: number;
        agentId: number;
    }): Promise<Transaction> {
        const transaction = this.transactionRepository.create({
            signature: params.signature,
            nonce: params.nonce,
            amount: params.amount,
            currency: 'USDC',
            status: 'completed',
            userId: params.userId,
            agentId: params.agentId,
            metadata: JSON.stringify({
                verifiedAt: new Date().toISOString(),
                network: 'mainnet-beta',
            }),
        });

        return await this.transactionRepository.save(transaction);
    }
}
