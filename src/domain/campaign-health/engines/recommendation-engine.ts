import { Campaign } from '../entities/campaign';
import { AccountHealth } from '../entities/account-health';
import { Recommendation } from '../entities/recommendation';
import { SplitCampaignRule } from '../rules/split-campaign-rule';
import { CreateVariationsRule } from '../rules/create-variations-rule';
import { IncreaseDelayRule } from '../rules/increase-delay-rule';
import { NoLinksRule } from '../rules/no-links-rule';

export interface RecommendationRuleItem {
  matches(campaign: Campaign, health: AccountHealth, riskScore: number): boolean;
  generate(campaign: Campaign, health: AccountHealth): Recommendation;
}

const RULES: RecommendationRuleItem[] = [
  SplitCampaignRule,
  CreateVariationsRule,
  IncreaseDelayRule,
  NoLinksRule,
];

export function generateRecommendations(campaign: Campaign, health: AccountHealth, riskScore: number): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const rule of RULES) {
    if (rule.matches(campaign, health, riskScore)) {
      recommendations.push(rule.generate(campaign, health));
    }
  }

  return recommendations;
}
