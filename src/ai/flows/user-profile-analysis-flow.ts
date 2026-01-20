'use server';
/**
 * @fileOverview This file defines a Genkit flow for analyzing a user's profile.
 *
 * - runUserProfileAnalysis - Generates an analysis based on user data and a question.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

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
    // We can't use hooks here, so we initialize a server-side instance of Firebase.
    const { firestore } = initializeFirebase();

    // Fetch all related data for a comprehensive analysis
    const userRef = doc(firestore, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userSnap.data();

    // Fetch related data to enrich the context for the AI
    let cellData = null;
    if (userData.hierarchy?.celulaId) {
        const cellSnap = await getDoc(doc(firestore, 'cells', userData.hierarchy.celulaId));
        if (cellSnap.exists()) cellData = cellSnap.data();
    }

    let supervisorData = null;
    if (userData.hierarchy?.supervisorId) {
        const supervisorSnap = await getDoc(doc(firestore, 'users', userData.hierarchy.supervisorId));
        if (supervisorSnap.exists()) supervisorData = { name: supervisorSnap.data().name };
    }

    // Combine all data into one object for the prompt
    const comprehensiveData = {
        profile: userData,
        cellGroup: cellData,
        supervisor: supervisorData,
        // In the future, we could add attendance, notes, etc. here
    };

    const result = await analysisPrompt({
        userData: JSON.stringify(comprehensiveData, null, 2),
        question: question,
    });
    
    return result.text || "Não foi possível gerar uma análise.";
  }
);
