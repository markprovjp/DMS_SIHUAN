import { describe, test, expect } from "vitest";
import {
  AI_VISION_SYSTEM_PROMPT,
  AI_VISION_USER_PROMPT_TEMPLATE,
} from "@dms-admin/ai-prompts";

describe("Vision Prompts Privacy Compliance", () => {
  test("system prompt must not contain face recognition, biometric or identity verification language", () => {
    const forbiddenKeywords = [
      "face recognition",
      "nhận diện khuôn mặt",
      "identity verification",
      "xác minh danh tính",
      "biometric",
      "sinh trắc học",
      "nhận diện người",
      "identify user",
      "verify user",
      "xác thực khuôn mặt",
      "nhận diện danh tính",
    ];

    const promptLower = AI_VISION_SYSTEM_PROMPT.toLowerCase();

    forbiddenKeywords.forEach((keyword) => {
      expect(promptLower).not.toContain(keyword.toLowerCase());
    });
  });

  test("user prompt template must not contain face recognition, biometric or identity verification language", () => {
    const forbiddenKeywords = [
      "face recognition",
      "nhận diện khuôn mặt",
      "identity verification",
      "xác minh danh tính",
      "biometric",
      "sinh trắc học",
      "nhận diện người",
      "identify user",
      "verify user",
      "xác thực khuôn mặt",
      "nhận diện danh tính",
    ];

    const promptLower = AI_VISION_USER_PROMPT_TEMPLATE({}).toLowerCase();

    forbiddenKeywords.forEach((keyword) => {
      expect(promptLower).not.toContain(keyword.toLowerCase());
    });
  });

  test("prompts must only focus on work relevance, image quality, and privacy risk classification", () => {
    const targetKeywords = [
      "quality",
      "work",
      "privacy",
      "blurry",
      "confidence",
      "chất lượng",
      "công việc",
      "riêng tư",
      "mờ",
      "phân loại",
    ];

    const promptLower = (
      AI_VISION_SYSTEM_PROMPT +
      " " +
      AI_VISION_USER_PROMPT_TEMPLATE({})
    ).toLowerCase();

    const hasSomeKeywords = targetKeywords.some((keyword) =>
      promptLower.includes(keyword.toLowerCase()),
    );
    expect(hasSomeKeywords).toBe(true);
  });
});
