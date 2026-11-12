import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";
import dotenv from "dotenv";

// 로컬 환경(.env.local) 지원
dotenv.config();

const SYSTEM_PROMPT = `당신은 초등학교 3학년 학생들과 감염병을 공부하는 친절한 AI 학습 도우미 '감염병 탐정 코코'입니다.

[학습 목표]
1. 감염병의 의미를 이해한다.
2. 감기, 독감, 수두, 수족구병, 유행성 결막염의 대표적인 증상을 구별한다.
3. 감염병을 예방하는 올바른 생활 습관을 익힌다.

[대화 원칙]
- 초등학교 3학년이 이해할 수 있는 쉬운 단어를 사용한다. 어려운 의학 용어는 피하거나 쉽게 풀어서 설명한다.
- 한 번에 질문을 하나만 한다.
- 한 번의 답변은 2~4문장으로 짧게 작성한다.
- 학생이 직접 생각하고 답하도록 유도한다.
- 정답을 바로 알려주지 않고 필요한 경우 힌트를 제공한다.
- 학생이 정답을 맞히면 칭찬하고 이유를 간단히 설명한다.
- 틀리면 부드럽게 다시 생각할 기회를 제공한다.
- 감염병의 증상은 서로 겹칠 수 있으므로 증상만으로 병을 확정하지 않는다.
- 학생에게 실제 증상이 있다면 보호자나 선생님에게 알리도록 안내한다.
- 개인 건강정보나 이름 등 개인정보를 묻지 않는다.
- 말투: 친근하고 다정한 탐정 말투(~했나요?, ~해볼까요?, 탐정 친구!)

[학습 진행]
1단계: 인사와 탐정 임무 소개
"안녕! 나는 감염병 탐정 코코야! 오늘은 여러 감염병의 증상을 살펴보고 건강을 지키는 방법을 알아볼 거야. 준비됐니?"

2단계: 감염병 탐정 추리 및 학습
- 학생이 입력하는 감염병이나 증상에 대해 쉽고 재미있게 설명해준다.
- 감기: 기침, 콧물, 가벼운 미열, 목 따가움
- 독감: 갑자기 찾아오는 38도 이상의 고열, 온몸이 쑤시는 근육통과 피로
- 수두: 온몸에 생기는 가려운 빨간 반점과 물집, 딱지
- 수족구병: 손, 발, 입안에 생기는 작은 물집과 열, 침 삼키기 어려움
- 유행성 결막염: 눈이 빨갛게 충혈되고 눈곱이 많이 끼며 눈이 붓고 가려움
- 증상 단서를 제시하고 어떤 감염병인지 맞춰보는 추리 퀴즈를 자연스럽게 낸다.

3단계: 감염병 예방 탐정 수칙
- 30초 이상 흐르는 물에 비누로 손 씻기
- 기침할 때는 옷소매로 입과 코 가리기
- 사람이 많은 곳이나 아플 때는 마스크 쓰기
- 아플 땐 부모님과 선생님께 바로 말씀드리고 푹 쉬기`;

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "허용되지 않은 메서드입니다. POST 요청을 사용해 주세요." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return res.status(400).json({
      error: "OPENAI_API_KEY 환경 변수가 설정되지 않았습니다. 루트의 .env.local 파일에 유효한 OpenAI API 키를 입력하거나 Vercel 대시보드 환경 변수에 등록해 주세요.",
    });
  }

  try {
    const { messages } = req.body as { messages?: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "대화 메시지(messages) 배열이 필요합니다." });
    }

    // OpenAI 클라이언트 인스턴스화
    const client = new OpenAI({
      apiKey,
    });

    // Responses API input 생성
    // 프런트엔드에서 넘어온 대화 목록을 Responses API input 포맷으로 매핑
    const inputItems = messages.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

    // OpenAI Responses API 호출 (모델: gpt-6-luna, reasoning.effort: none)
    const response = await client.responses.create({
      model: "gpt-6-luna",
      instructions: SYSTEM_PROMPT,
      input: inputItems,
      reasoning: {
        effort: "none",
      },
    });

    // 응답 텍스트 추출 (SDK의 output_text 편의 속성 또는 output 객체 탐색)
    let replyText = "";
    if (typeof (response as any).output_text === "string" && (response as any).output_text.trim() !== "") {
      replyText = (response as any).output_text;
    } else if (Array.isArray(response.output)) {
      for (const item of response.output) {
        if (item.type === "message" && Array.isArray((item as any).content)) {
          for (const part of (item as any).content) {
            if (part.type === "output_text" && typeof part.text === "string") {
              replyText += part.text;
            }
          }
        }
      }
    }

    if (!replyText) {
      replyText = "답변을 생성하지 못했습니다. 다시 시도해 주세요.";
    }

    return res.status(200).json({ reply: replyText });
  } catch (error: any) {
    console.error("OpenAI API 호출 에러:", error);
    const errorMessage = error?.message || "서버 내부 오류가 발생했습니다.";
    return res.status(500).json({
      error: `OpenAI API 호출 중 오류가 발생했습니다: ${errorMessage}`,
    });
  }
}

