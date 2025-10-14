import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../../app.module';
import { SubscriptionPlan } from '../schemas';

async function seedSubscriptionPlans() {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const subscriptionPlanModel = app.get(getModelToken(SubscriptionPlan.name));

    const plans = [
        {
            name: 'clinic',
            maxOrganizations: 0,
            maxComplexes: 0,
            maxClinics: 1,
            price: 99.99,
        },
        {
            name: 'complex',
            maxOrganizations: 0,
            maxComplexes: 1,
            maxClinics: 10,
            price: 299.99,
        },
        {
            name: 'company',
            maxOrganizations: 1,
            maxComplexes: 50,
            maxClinics: 500,
            price: 999.99,
        },
    ];

    for (const plan of plans) {
        const existing = await subscriptionPlanModel.findOne({ name: plan.name });
        if (!existing) {
            await subscriptionPlanModel.create(plan);
            console.log(`✓ Created subscription plan: ${plan.name}`);
        } else {
            console.log(`• Subscription plan already exists: ${plan.name}`);
        }
    }

    await app.close();
}

seedSubscriptionPlans()
    .then(() => {
        console.log('✅ Subscription plans seeding completed.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Subscription plans seeding failed:', err);
        process.exit(1);
    });