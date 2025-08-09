import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Goal {
  targetValue: number;
  targetDate: Date;
}

interface Wallet {
  classes: string;
  percentages: number;
}

export interface ClientDataForSuggestions {
  clientId: string;
  totalPatrimony: number;
  goals: Goal[];
  wallet: Wallet;
}

export interface Suggestion {
  type: 'contribution' | 'rebalance' | 'goals_review';
  description: string;
  details?: any;
}

export async function generateSuggestions(clientData: ClientDataForSuggestions): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];

  const totalInPlan = clientData.goals.reduce((acc, goal) => acc + goal.targetValue, 0);
  const alignmentPercentage = (totalInPlan / clientData.totalPatrimony) * 100;

  let category = 'red';
  if (alignmentPercentage >= 80) {
    category = 'green';
  } else if (alignmentPercentage >= 50) {
    category = 'yellow';
  }

  if (category === 'red') {
    suggestions.push({
      type: 'contribution',
      description: 'Your current patrimony is significantly below your goals. Consider increasing your monthly contributions.',
      details: {
        currentAlignment: alignmentPercentage,
        recommendedIncrease: '20%', // Example suggestion
      },
    });
    suggestions.push({
      type: 'goals_review',
      description: 'Your goals might be too ambitious given your current financial situation. Consider reviewing and adjusting them.',
    });
  } else if (category === 'yellow') {
    suggestions.push({
      type: 'contribution',
      description: 'You are somewhat aligned with your goals, but increasing contributions could accelerate your progress.',
      details: {
        currentAlignment: alignmentPercentage,
        recommendedIncrease: '10%', // Example suggestion
      },
    });
    suggestions.push({
      type: 'rebalance',
      description: 'Review your wallet allocation to ensure it aligns with your risk tolerance and time horizon.',
      details: {
        currentWallet: clientData.wallet,
        recommendation: 'Consider diversifying or adjusting percentages based on market conditions.',
      },
    });
  } else if (category === 'green') {
    suggestions.push({
      type: 'goals_review',
      description: 'You are well on track to achieve your goals! Consider setting new, more ambitious goals or exploring advanced investment strategies.',
    });
  }

  return suggestions;
}
