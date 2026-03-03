/**
 * AI Patient Chatbot (RAG §9.1): conversational assistant grounded in patient's own health data.
 * Uses context injection (no vector DB in v1); multi-turn history stored in patient_chat_messages.
 */
import { db } from "../db.js";
import { patientChatMessages } from "../../shared/schema.js";
import { eq, desc } from "drizzle-orm";
import { completeWithMessages, type ChatMessage } from "./llm.service.js";
import { getPatientContextForChat } from "./patient-chat-context.service.js";

const MAX_HISTORY_MESSAGES = 20; // last N messages to include in context

const SYSTEM_PROMPT = `You are NexaCare's friendly health assistant. You help patients understand their own health information and the NexaCare platform.

RULES:
1. Use ONLY the "Patient context" below to answer questions about this patient's data (medications, lab results, appointments, etc.). Do not invent or assume any data not in the context.
2. If the user asks something not covered by the context, say you don't have that information and suggest they check the app or ask their doctor.
3. For any clinical decision, change in medication, or "is this normal?" type question, always end with: "Please confirm with your doctor or pharmacist."
4. Be concise, clear, and use simple language. You can explain medical terms briefly.
5. Do not provide general medical advice beyond explaining the patient's own records. Never diagnose or recommend treatments.
6. If the user seems to be in an emergency (severe symptoms, self-harm, etc.), say: "If this is an emergency, please contact your local emergency number or go to the nearest hospital."`;

export async function getChatHistory(patientId: number, limit: number = 50) {
  const rows = await db
    .select({ id: patientChatMessages.id, role: patientChatMessages.role, content: patientChatMessages.content, createdAt: patientChatMessages.createdAt })
    .from(patientChatMessages)
    .where(eq(patientChatMessages.patientId, patientId))
    .orderBy(desc(patientChatMessages.createdAt))
    .limit(limit);
  return rows.reverse();
}

export async function sendMessage(patientId: number, userContent: string): Promise<{ reply: string }> {
  if (!userContent?.trim()) {
    throw new Error("Message is required.");
  }

  const context = await getPatientContextForChat(patientId);
  const systemWithContext = `${SYSTEM_PROMPT}\n\n## Patient context\n${context}`;

  const history = await getChatHistory(patientId, MAX_HISTORY_MESSAGES);
  const messages: ChatMessage[] = [{ role: "system", content: systemWithContext }];
  for (const h of history) {
    messages.push({ role: h.role as "user" | "assistant", content: h.content });
  }
  messages.push({ role: "user", content: userContent.trim() });

  const reply = await completeWithMessages(messages);

  await db.insert(patientChatMessages).values([
    { patientId, role: "user", content: userContent.trim() },
    { patientId, role: "assistant", content: reply },
  ]);

  return { reply };
}
