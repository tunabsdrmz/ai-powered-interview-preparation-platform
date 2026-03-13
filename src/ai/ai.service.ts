import { Injectable } from '@nestjs/common';
import { GroqService } from '../groq/groq.service';

@Injectable()
export class AiService {
  constructor(private readonly groqService: GroqService) {}

  async generateQuestion(
    topic: string,
    difficulty: 'junior' | 'mid' | 'senior',
  ): Promise<string> {
    const systemPrompt = `You are an expert technical interviewer. Generate a single interview question for the given topic and difficulty level. The question should be clear, specific, and test real understanding. Return only the question text, nothing else.`;

    const userMessage = `Topic: ${topic}\nDifficulty: ${difficulty}`;

    return this.groqService.chatCompletion(systemPrompt, userMessage, {
      maxTokens: 512,
      temperature: 0.8,
    });
  }

  async evaluateAnswer(question: string, answer: string): Promise<string> {
    const systemPrompt = `You are an expert technical interviewer evaluating a candidate's answer. 
Evaluate the answer and return a JSON object with this exact structure:
{
  "score": <number 1-10>,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "correctness": "<correct | partially_correct | incorrect>"
}
Return only valid JSON, no extra text.`;

    const userMessage = `Question: ${question}\n\nCandidate's Answer: ${answer}`;

    return this.groqService.chatCompletion(systemPrompt, userMessage, {
      maxTokens: 1024,
      temperature: 0.3,
    });
  }

  async generateFeedback(question: string, answer: string): Promise<string> {
    const systemPrompt = `You are a supportive technical interview coach. Based on the question and the candidate's answer, provide detailed and constructive feedback. Include:
1. What was done well
2. What could be improved
3. A model answer or key points the ideal answer should cover
4. Specific tips for improvement

Be encouraging but honest. Format the response in clear sections.`;

    const userMessage = `Question: ${question}\n\nCandidate's Answer: ${answer}`;

    return this.groqService.chatCompletion(systemPrompt, userMessage, {
      maxTokens: 1536,
      temperature: 0.6,
    });
  }
}
