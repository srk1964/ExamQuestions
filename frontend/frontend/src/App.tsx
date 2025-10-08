import React, { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL; // e.g., https://abc123.execute-api.us-east-1.amazonaws.com/prod

function App() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [results, setResults] = useState<Record<string, { correct: boolean; feedback: string }>>({});

  useEffect(() => {
    fetch(`${API_URL}/list-subjects`)
      .then(r => r.json())
      .then(setSubjects)
      .catch(console.error);
  }, []);

  const loadQuiz = async (subject: string) => {
    setSelected(subject);
    const bucketBaseUrl = import.meta.env.VITE_BUCKET_BASE_URL; // e.g., https://<cloudfront-domain>/quiz-content
    const res = await fetch(`${bucketBaseUrl}/${subject}.json`);
    const data = await res.json();
    setQuestions(data.questions || []);
    setResults({});
  };

  const grade = (q: any, answer: string) => {
    const correct = answer === q.correctAnswer;
    const feedback = correct ? "✅ Correct!" : `❌ Incorrect. ${q.explanation}`;
    setResults(prev => ({ ...prev, [q.id]: { correct, feedback } }));
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Quiz App</h1>
      {!selected && (
        <>
          <h2>Select a subject</h2>
          <div>
            {subjects.map(s => (
              <button key={s} onClick={() => loadQuiz(s)} style={{ marginRight: 8 }}>{s}</button>
            ))}
          </div>
        </>
      )}
      {selected && (
        <>
          <h2>{selected} Quiz</h2>
          {questions.map((q) => (
            <div key={q.id} style={{ marginBottom: 16 }}>
              <p>{q.prompt}</p>
              {q.type === "mcq" ? (
                q.options.map((opt: string) => (
                  <button key={opt} onClick={() => grade(q, opt)} style={{ marginRight: 8 }}>{opt}</button>
                ))
              ) : (
                <ShortAnswer q={q} onSubmit={(a) => grade(q, a)} />
              )}
              {results[q.id] && <p>{results[q.id].feedback}</p>}
            </div>
          ))}
          <button onClick={() => setSelected(null)}>Back</button>
        </>
      )}
    </div>
  );
}

function ShortAnswer({ q, onSubmit }: { q: any; onSubmit: (a: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div>
      <input value={val} onChange={e => setVal(e.target.value)} placeholder="Your answer" />
      <button onClick={() => onSubmit(val)}>Submit</button>
    </div>
  );
}

export default App;

