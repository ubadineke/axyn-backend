/**
 * Cleanup script - Deletes ALL agents from database
 * 
 * Usage:
 *   JWT_TOKEN="your_token" npx ts-node scripts/cleanup-all-agents.ts
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.JWT_TOKEN;

async function cleanupAllAgents() {
    if (!JWT_TOKEN || JWT_TOKEN === 'your_token_here') {
        console.error('❌ JWT_TOKEN environment variable is required');
        console.error('\nUsage:');
        console.error('  JWT_TOKEN="your_jwt_token" npx ts-node scripts/cleanup-all-agents.ts');
        process.exit(1);
    }

    console.log('🗑️  Fetching all agents from', BASE_URL);

    try {
        // Fetch all agents
        const listResponse = await fetch(`${BASE_URL}/agent`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!listResponse.ok) {
            throw new Error(`Failed to fetch agents: ${listResponse.statusText}`);
        }

        const agents = await listResponse.json();
        console.log(`📊 Found ${agents.length} agents to delete\n`);

        if (agents.length === 0) {
            console.log('✅ Database is already clean!');
            return;
        }

        let successCount = 0;
        let failCount = 0;

        for (const agent of agents) {
            try {
                const deleteResponse = await fetch(`${BASE_URL}/agent/${agent.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token: JWT_TOKEN }),
                });

                if (!deleteResponse.ok) {
                    throw new Error(`HTTP ${deleteResponse.status}`);
                }

                console.log(`✅ Deleted: ${agent.name} (ID: ${agent.id})`);
                successCount++;
            } catch (error: any) {
                console.error(`❌ Failed to delete: ${agent.name} (ID: ${agent.id})`);
                console.error(`   Error: ${error.message}`);
                failCount++;
            }
        }

        console.log('\n📊 Results:');
        console.log(`   ✅ Deleted: ${successCount}`);
        console.log(`   ❌ Failed: ${failCount}`);
        console.log('\n🎉 Cleanup complete!');
    } catch (error: any) {
        console.error('💥 Cleanup failed:', error.message);
        process.exit(1);
    }
}

cleanupAllAgents();
