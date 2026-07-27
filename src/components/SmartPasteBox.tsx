"use client";

import { useState } from "react";
import {
  parsePatientMessage,
  type ParsedPatientData,
} from "@/lib/smart-paste-parser";

interface Props {
  onParsed: (data: ParsedPatientData) => void;
}

/**
 * SmartPasteBox — a textarea where the user can paste the Telegram-bot
 * patient message. On paste (or button click), the message is parsed
 * and the parsed fields are passed to the parent via `onParsed`.
 *
 * Visual style: a dashed blue box with RTL Arabic label, matching the
 * palette used elsewhere in the admin form (#0077b6 accent).
 */
export default function SmartPasteBox({ onParsed }: Props) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "partial">("idle");

  const tryParse = (raw: string) => {
    const parsed = parsePatientMessage(raw);
    const count = Object.keys(parsed).length;
    if (count >= 5) {
      onParsed(parsed);
      setStatus(count >= 12 ? "success" : "partial");
    }
  };

  return (
    <div
      style={{
        marginBottom: 24,
        padding: 16,
        border: "2px dashed #0077b6",
        borderRadius: 12,
        background: "#f0f8ff",
        direction: "rtl",
      }}
    >
      <label
        style={{
          fontWeight: "bold",
          color: "#0077b6",
          display: "block",
          marginBottom: 8,
        }}
      >
        📋 لصق سريع — الصق نموذج الرسالة هنا لتعبئة الحقول تلقائياً
      </label>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setStatus("idle");
        }}
        onPaste={(e) => {
          const raw = e.clipboardData.getData("text");
          // wait a tick so React state catches up, then parse
          setTimeout(() => tryParse(raw), 50);
        }}
        placeholder="الصق نص الرسالة هنا..."
        rows={6}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 8,
          border: "1px solid #90caf9",
          fontSize: 13,
          fontFamily: "Cairo, sans-serif",
          resize: "vertical",
          direction: "rtl",
          textAlign: "right",
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          marginTop: 8,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        {text && status === "idle" && (
          <button
            onClick={() => tryParse(text)}
            style={{
              padding: "6px 16px",
              background: "#0077b6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ✨ تعبئة تلقائية
          </button>
        )}
        {status === "success" && (
          <span
            style={{
              color: "#2e7d32",
              fontWeight: "bold",
              fontSize: 13,
            }}
          >
            ✅ تم تعبئة جميع الحقول تلقائياً — راجعها ثم اضغط إرسال
          </span>
        )}
        {status === "partial" && (
          <span
            style={{
              color: "#e65100",
              fontWeight: "bold",
              fontSize: 13,
            }}
          >
            ⚠️ تم تعبئة بعض الحقول — أكمل الباقي يدوياً
          </span>
        )}
      </div>
    </div>
  );
}
