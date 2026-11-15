/**
 * CBT Multimodal Gemini Vision Question Extractor
 * Uses Google Gemini API (gemini-2.0-flash / gemini-1.5-flash) to perform visual document understanding
 * on rendered PDF page images when an API key (GEMINI_API_KEY / GOOGLE_API_KEY) is available.
 * Returns strictly-typed JSON MCQs preserving equations, chemical reactions, diagrams, and original language.
 */

async function extractQuestionsWithGeminiVision({
  pageBuffers = [],
  subject = 'Physics',
  marks = 4,
  negativeMarks = 1,
  apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
}) {
  if (!apiKey || !Array.isArray(pageBuffers) || pageBuffers.length === 0) {
    return null;
  }

  const model = process.env.GEMINI_VISION_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const allQuestions = [];

  const systemInstruction = `You are a high-precision academic examination document parser specialized in Gujarati and English Science and Mathematics question papers.
Your task is to analyze the attached exam page image and extract all multiple-choice questions (MCQs).
Rules:
1. Preserve the exact question language (Gujarati / English / Hindi).
2. For mathematical expressions, preserve fractions (e.g. 5/3), square roots (e.g. √3), powers (e.g. x²), vectors (e.g. î, ĵ, k̂, r⃗), and Greek letters (e.g. θ, λ, π).
3. For chemical formulas and reactions, preserve molecular names, formulas (e.g. CnH2n, AlCl3, NaNH2), and reaction conditions.
4. Extract exactly 4 options for each question: [Option A, Option B, Option C, Option D].
5. If the options are chemical structures or drawings without text, set option text as empty string or describe the structure (e.g. 'Benzene', 'Naphthalene').
6. Set hasDiagram to true if the question contains a diagram, circuit, graph, geometric drawing, or visual table.
7. If an answer key or solution table is present on this page, map question numbers to their correct answers (A, B, C, or D).
8. Never hallucinate or invent questions that do not exist on the page.`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      questions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            questionNo: { type: 'INTEGER' },
            questionText: { type: 'STRING' },
            options: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              minItems: 4,
              maxItems: 4,
            },
            hasDiagram: { type: 'BOOLEAN' },
            correctAnswer: { type: 'STRING' },
          },
          required: ['questionNo', 'questionText', 'options'],
        },
      },
    },
    required: ['questions'],
  };

  for (let pIdx = 0; pIdx < pageBuffers.length; pIdx++) {
    const buf = pageBuffers[pIdx];
    if (!buf || buf.length < 500) continue;

    const base64Data = Buffer.isBuffer(buf) ? buf.toString('base64') : String(buf).replace(/^data:[^;]+;base64,/, '');

    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `Page ${pIdx + 1}: Extract all MCQs from this exam question paper page.` },
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Data,
              },
            },
          ],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    };

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        console.warn(`Gemini Vision API error (page ${pIdx + 1}):`, resp.status, errText);
        continue;
      }

      const data = await resp.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText);
      if (parsed && Array.isArray(parsed.questions)) {
        parsed.questions.forEach(q => {
          if (q.questionText && Array.isArray(q.options) && q.options.length >= 2) {
            while (q.options.length < 4) {
              q.options.push(`Option ${['A', 'B', 'C', 'D'][q.options.length]}`);
            }
            allQuestions.push({
              id: `q_${subject.toLowerCase()}_${q.questionNo || allQuestions.length + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              subject,
              questionNo: q.questionNo || allQuestions.length + 1,
              marks: Number(marks) || 4,
              negativeMarks: Number(negativeMarks) || 1,
              questionText: q.questionText.trim(),
              imageUrl: '',
              options: q.options.slice(0, 4).map(o => String(o || '').trim()),
              correctAnswer: ['A', 'B', 'C', 'D'].includes(String(q.correctAnswer).toUpperCase())
                ? String(q.correctAnswer).toUpperCase()
                : 'A',
              hasDiagram: Boolean(q.hasDiagram),
            });
          }
        });
      }
    } catch (apiErr) {
      console.warn(`Gemini Vision extraction failed on page ${pIdx + 1}:`, apiErr.message);
    }
  }

  return allQuestions.length > 0 ? allQuestions : null;
}

module.exports = {
  extractQuestionsWithGeminiVision,
};
