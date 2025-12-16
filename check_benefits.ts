
import { db } from './src/db';
import { coreBenefits } from './src/db/schema';

async function checkBenefits() {
    try {
        const benefits = await db.select().from(coreBenefits);
        console.log('Benefits found:', benefits.length);
        console.log(JSON.stringify(benefits, null, 2));
    } catch (error) {
        console.error('Error fetching benefits:', error);
    }
}

checkBenefits();
