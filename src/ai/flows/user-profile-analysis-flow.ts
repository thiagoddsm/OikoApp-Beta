'use server';
/**
 * @fileOverview This file defines a Genkit flow for analyzing a user's profile.
 *
 * - runUserProfileAnalysis - Generates an analysis based on user data and a question.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase-admin';

const UserProfileAnalysisInputSchema = z.object({
  userId: z.string().describe('The ID of the user to analyze.'),
  question: z.string().describe('The question to answer about the user.'),
});
type UserProfileAnalysisInput = z.infer<typeof UserProfileAnalysisInputSchema>;

// No specific output schema needed, we'll just return text.
const UserProfileAnalysisOutputSchema = z.string();

export async function runUserProfileAnalysis(input: UserProfileAnalysisInput): Promise<string> {
  const analysis = await userProfileAnalysisFlow(input);
  return analysis;
}

const AnalysisPromptInputSchema = z.object({
  userData: z.string(),
  question: z.string(),
});

const analysisPrompt = ai.definePrompt({
  name: 'userProfileAnalysisPrompt',
  input: { schema: AnalysisPromptInputSchema },
  prompt: `You are an expert church management assistant. Your task is to provide a concise and insightful summary answering a specific question about a church member, based on their profile data.

The data is provided in a JSON object which includes their personal details, spiritual journey status ('integrationStatus'), cell group information, service history, and other relevant fields.

When answering, focus on the most relevant information to the question asked. Be empathetic and constructive in your language, as if you were advising a pastor or leader.

---
MEMBER'S DATA:
\`\`\`json
{{{userData}}}
\`\`\`

---
QUESTION FROM LEADER:
"{{{question}}}"

---
YOUR ANALYSIS:
`,
});

const userProfileAnalysisFlow = ai.defineFlow(
  {
    name: 'userProfileAnalysisFlow',
    inputSchema: UserProfileAnalysisInputSchema,
    outputSchema: UserProfileAnalysisOutputSchema,
  },
  async ({ userId, question }) => {
    // Use the Firebase Admin SDK to bypass client security rule limitations
    const db = getAdminDb();

    // Fetch all related data for a comprehensive analysis
    const userSnap = await db.collection('users').doc(userId).get();

    if (!userSnap.exists) {
      throw new Error('User not found');
    }
    
    const userData = userSnap.data() || {};

    // Fetch related data to enrich the context for the AI
    let cellData = null;
    if (userData.hierarchy?.celulaId) {
        const cellSnap = await db.collection('cells').doc(userData.hierarchy.celulaId).get();
        if (cellSnap.exists) cellData = cellSnap.data();
    }

    let supervisorData = null;
    if (userData.hierarchy?.supervisorId) {
        const supervisorSnap = await db.collection('users').doc(userData.hierarchy.supervisorId).get();
        if (supervisorSnap.exists) supervisorData = { name: supervisorSnap.data()?.name };
    }

    // Combine all data into one object for the prompt
    const comprehensiveData = {
        profile: userData,
        cellGroup: cellData,
        supervisor: supervisorData,
    };

    const result = await analysisPrompt({
        userData: JSON.stringify(comprehensiveData, null, 2),
        question: question,
    });
    
    return result.text || "Não foi possível gerar uma análise.";
  }
);
