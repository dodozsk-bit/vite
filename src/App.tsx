import React, { useState, useRef, useEffect } from "react";
import "./App.css";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const INITIAL_GREETING =
  "안녕! 나는 감염병 탐정 코코야! 오늘은 여러 감염병의 증상을 살펴보고 건강을 지키는 방법을 알아볼 거야. 준비됐니?";

const QUICK_CHIPS = [
  { label: "준비됐어! 탐정 퀴즈 시작하자! 🕵️", prompt: "준비됐어! 감염병 탐정 퀴즈 하나 내줘!" },
  { label: "감기와 독감의 차이가 뭐야? 🌡️", prompt: "감기랑 독감은 어떻게 다른 감염병이야?" },
  { label: "수족구병 증상이 궁금해! 🖐️", prompt: "수족구병에 걸리면 어떤 증상이 나타나?" },
  { label: "수두는 어떤 증상이야? 🔴", prompt: "수두는 어떤 증상이 나타나는 감염병이야?" },
  { label: "유행성 결막염에 대해 알려줘! 👀", prompt: "유행성 결막염에 걸리면 눈이 어떻게 돼?" },
  { label: "손 씻기는 어떻게 해? 🧼", prompt: "감염병을 예방하려면 손을 어떻게 씻어야 해?" },
];

const INITIAL_MESSAGE: Message = {
  id: "initial-message",
  role: "assistant",
  content: INITIAL_GREETING,
  timestamp: new Date(0),
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!textToSend) {
      setInputText("");
    }
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // 보안 원칙: 프런트엔드는 API 키 없이 내부 서버리스 엔드포인트 /api/chat 만 호출
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // 서버로 대화 히스토리 전달
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "답변을 가져오는 중 오류가 발생했습니다.");
      }

      const botMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply || "미안해, 답변을 잘 만들지 못했어. 다시 한 번 물어봐 줄래?",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error("채팅 요청 에러:", err);
      const errMsg = err?.message || "서버와 연결할 수 없습니다.";
      setErrorMessage(errMsg);

      // 사용자에게도 에러를 부드럽게 안내
      const fallbackBotMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          "앗! 탐정 본부와의 연결에 문제가 생겼어. 😢 루트 디렉터리의 `.env.local` 파일에 `OPENAI_API_KEY`가 올바르게 입력되어 있는지 확인해 줘!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackBotMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleResetChat = () => {
    if (window.confirm("탐정 코코와의 대화를 처음부터 다시 시작할까요?")) {
      setMessages([
        {
          id: `initial-${Date.now()}`,
          role: "assistant",
          content: INITIAL_GREETING,
          timestamp: new Date(),
        },
      ]);
      setErrorMessage(null);
      setInputText("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="app-container">
      <main className="chat-card">
        {/* Header */}
        <header className="chat-header">
          <div className="header-profile">
            <div className="coco-avatar-badge" aria-label="탐정 코코 아바타">
              🕵️
              <span className="coco-status-dot" title="온라인"></span>
            </div>
            <div className="header-title-box">
              <h1>
                감염병 탐정 코코 <span className="header-tag">초등 3학년</span>
              </h1>
              <p>증상 추리 퀴즈와 함께 감염병 예방법을 배워보아요!</p>
            </div>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="reset-button"
              onClick={handleResetChat}
              title="대화 다시 시작하기"
            >
              🔄 새로 시작
            </button>
          </div>
        </header>

        {/* Missions banner */}
        <div className="missions-banner">
          <span className="mission-label">오늘의 탐정 임무</span>
          <div className="mission-items">
            <span className="mission-item">🔍 1. 감염병 뜻 알기</span>
            <span className="mission-item">🌡️ 2. 5대 감염병 증상 구별하기</span>
            <span className="mission-item">🧼 3. 올바른 예방 습관 익히기</span>
          </div>
        </div>

        {/* Chat message list */}
        <div className="messages-container" role="log" aria-live="polite">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.role === "assistant" ? "coco" : "user"}`}>
              <div
                className={`avatar-icon ${msg.role === "assistant" ? "coco-icon" : "user-icon"}`}
                aria-hidden="true"
              >
                {msg.role === "assistant" ? "🕵️" : "🧒"}
              </div>
              <div className="message-bubble-wrap">
                <span className="message-sender">
                  {msg.role === "assistant" ? "탐정 코코" : "어린이 탐정"}
                </span>
                <div className="message-bubble">{msg.content}</div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="message-row coco">
              <div className="avatar-icon coco-icon" aria-hidden="true">
                🕵️
              </div>
              <div className="message-bubble-wrap">
                <span className="message-sender">탐정 코코</span>
                <div className="typing-bubble">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <span className="typing-text">코코 탐정이 단서를 생각하고 있어요...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="error-alert" role="alert">
            <span className="error-alert-icon">⚠️</span>
            <div className="error-alert-body">
              <div className="error-alert-title">안내</div>
              <div>{errorMessage}</div>
            </div>
          </div>
        )}

        {/* Quick chip buttons */}
        <div className="chips-container" aria-label="추천 질문 목록">
          {QUICK_CHIPS.map((chip, index) => (
            <button
              key={index}
              type="button"
              className="chip-button"
              disabled={isLoading}
              onClick={() => handleSendMessage(chip.prompt)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input form */}
        <div className="input-area">
          <form className="input-form" onSubmit={handleFormSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="증상이나 궁금한 감염병을 코코에게 물어보세요!"
              disabled={isLoading}
              autoFocus
            />
            <button
              type="submit"
              className="send-button"
              disabled={isLoading || !inputText.trim()}
              aria-label="메시지 전송"
            >
              <span>전송</span> 🔍
            </button>
          </form>
          <div className="input-footer">
            <span>💡 몸이 실제로 아플 때는 꼭 부모님이나 선생님께 바로 말씀드려요!</span>
          </div>
        </div>
      </main>
    </div>
  );
}
