import 'dotenv/config';
import { db } from './src/db/index.ts';
import { benefits, seniors, users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

function formatDate(value) {
  if (!value) return 'N/A';
  try {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    // Postgres driver may return string for dates
    const asString = String(value);
    if (asString.includes('T')) {
      return asString.split('T')[0];
    }
    return asString;
  } catch {
    return String(value);
  }
}

async function main() {
  console.log('🔍 Checking benefits in database...');

  try {
    // Join benefits -> seniors -> users to get senior names
    const rows = await db
      .select({
        id: benefits.id,
        benefitType: benefits.benefitType,
        status: benefits.status,
        amount: benefits.amount,
        applicationDate: benefits.applicationDate,
        renewalDate: benefits.renewalDate,
        seniorId: benefits.seniorId,
        seniorUserId: seniors.userId,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(benefits)
      .leftJoin(seniors, eq(benefits.seniorId, seniors.id))
      .leftJoin(users, eq(seniors.userId, users.id));

    const total = rows.length;
    const byStatus = rows.reduce((acc, row) => {
      const key = (row.status || 'unknown').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, /** @type {Record<string, number>} */ ({}));

    console.log('');
    console.log('================ BENEFITS SUMMARY ================');
    console.log(`Total benefits: ${total}`);
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });

    if (total === 0) {
      console.log('No benefits found.');
      return;
    }

    console.log('');
    console.log('================ BENEFIT DETAILS ================');
    rows.forEach((row) => {
      const seniorName = [row.firstName, row.lastName].filter(Boolean).join(' ') || `Senior #${row.seniorId ?? 'N/A'}`;
      console.log(`\n[ID ${row.id}] ${row.benefitType || 'Unknown type'} (${row.status || 'no status'})`);
      console.log(`  Senior      : ${seniorName}`);
      console.log(`  Amount      : ${row.amount || 'N/A'}`);
      console.log(`  Applied on  : ${formatDate(row.applicationDate)}`);
      console.log(`  Renewal due : ${formatDate(row.renewalDate)}`);
    });

    console.log('\n✅ Done.');
  } catch (err) {
    console.error('❌ Failed to load benefits:', err);
    process.exitCode = 1;
  }
}

main();
