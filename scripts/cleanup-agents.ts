/**
 * Cleanup script to delete all agents
 * 
 * Usage: JWT_TOKEN="your_token" npx ts-node scripts/cleanup-agents.ts
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.JWT_TOKEN;

async function cleanupAgents() {
  if (!JWT_TOKEN) {
    console.error('❌ JWT_TOKEN required');
    process.exit(1);
  }

  console.log('🧹 Fetching all agents...');

  // Get all agents
  const response = await fetch(`${BASE_URL}/agent`);
  const agents = await response.json();

  console.log(`Found ${agents.length} agents to delete\n`);

  for (const agent of agents) {
    try {
      const deleteResponse = await fetch(`${BASE_URL}/agent/${agent.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: JWT_TOKEN,
        }),
      });

      if (deleteResponse.ok) {
        console.log(`✅ Deleted: ${agent.name}`);
      } else {
        const error = await deleteResponse.json().catch(() => ({ message: deleteResponse.statusText }));
        console.error(`❌ Failed to delete ${agent.name}: ${JSON.stringify(error)}`);
      }
    } catch (error: any) {
      console.error(`❌ Error deleting ${agent.name}: ${error.message}`);
    }
  }

  console.log('\n✨ Cleanup complete!');
}

cleanupAgents().catch((error) => {
  console.error('💥 Cleanup failed:', error.message);
  process.exit(1);
});
