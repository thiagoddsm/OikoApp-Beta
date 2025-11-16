'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating personalized WhatsApp follow-up tasks for new church visitors.
 *
 * - generateNewMemberFollowUpTasks - Generates follow-up tasks for a new visitor.
 * - NewMemberInfo - The input type for the generateNewMemberFollowUpTasks function.
 * - FollowUpTasksOutput - The return type for the generateNewMemberFollowUpTasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NewMemberInfoSchema = z.object({
  visitorName: z.string().describe('The name of the new visitor.'),
  visitorType: z.enum(['culto', 'celula']).describe('The type of visitor (culto for church service, celula for cell group).'),
  leaderName: z.string().describe('The name of the cell leader.'),
  leaderPhoneNumber: z.string().describe('The phone number of the cell leader.'),
});

export type NewMemberInfo = z.infer<typeof NewMemberInfoSchema>;

const FollowUpTasksOutputSchema = z.object({
  followUpTasks: z.array(
    z.object({
      message: z.string().describe('The personalized follow-up message.'),
      dueDate: z.string().describe('The date when the task should be completed.'),
    })
  ).describe('An array of follow-up tasks for the new visitor.')
});

export type FollowUpTasksOutput = z.infer<typeof FollowUpTasksOutputSchema>;

export async function generateNewMemberFollowUpTasks(input: NewMemberInfo): Promise<FollowUpTasksOutput> {
  return newMemberFollowUpTasksFlow(input);
}

const newMemberFollowUpPrompt = ai.definePrompt({
  name: 'newMemberFollowUpPrompt',
  input: {schema: NewMemberInfoSchema},
  output: {schema: FollowUpTasksOutputSchema},
  prompt: `You are a helpful assistant designed to generate personalized WhatsApp follow-up tasks for church leaders to connect with new visitors. Generate 3 tasks with personalized messages and due dates for the following new visitor and church leader.

The tasks should be tailored based on whether the visitor came to a church service ('culto') or a cell group ('celula').

Visitor Name: {{{visitorName}}}
Visitor Type: {{{visitorType}}}
Leader Name: {{{leaderName}}}

Ensure the tasks are friendly, welcoming, and aimed at building a relationship with the new visitor. The due dates should be 1 day, 1 week, and 3 weeks after the visitor's first visit. Respond using JSON format.
`,
});

const newMemberFollowUpTasksFlow = ai.defineFlow(
  {
    name: 'newMemberFollowUpTasksFlow',
    inputSchema: NewMemberInfoSchema,
    outputSchema: FollowUpTasksOutputSchema,
  },
  async input => {
    const {output} = await newMemberFollowUpPrompt(input);
    return output!;
  }
);
