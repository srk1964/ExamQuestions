import { useEffect, useState } from "react";

interface Config {
  VITE_API_URL: string;
}

function App() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, { selected?: string; correct?: boolean }>>({});
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    // Fetch config.json from the root of the site
    fetch("/config.json")
      .then(async (res) => {
        if (!res.ok) throw new Error(`config.json returned ${res.status}`);
        try {
          const data = await res.json();
          setConfig(data);
        } catch (err) {
          // If the file isn't valid JSON (for example CloudFront returned index.html), surface that
          console.error("Failed to parse config.json:", err);
          throw new Error("Invalid config.json (not JSON)");
        }
      })
      .catch((err) => {
        console.error("Failed to load config:", err);
        setError("Failed to load app configuration: " + String(err));
        // Ensure we stop the 'Loading subjects...' state so the error is visible
        setLoadingSubjects(false);
      });
  }, []);

  useEffect(() => {
    if (!config) return;
    setLoadingSubjects(true);
    const url = `${config.VITE_API_URL.replace(/\/$/, "")}/list-subjects`;
    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`list-subjects returned ${res.status}`);
        }
        try {
          const data = await res.json();
          return data;
        } catch (err) {
          console.error("Failed to parse list-subjects response:", err);
          throw new Error("Invalid JSON from list-subjects");
        }
      })
      .then((data) => {
        setSubjects(Array.isArray(data) ? data : []);
        setLoadingSubjects(false);
      })
      .catch((err) => {
        console.error("Error fetching subjects:", err);
        setError("Failed to load subjects: " + String(err));
        setLoadingSubjects(false);
      });
  }, [config]);

  useEffect(() => {
    if (!selected || !config) return;
    setLoadingQuestions(true);
    setError(null);
    const url = `${config.VITE_API_URL}/list-subjects?subject=${encodeURIComponent(
      selected
    )}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data);
        // reset answers state when new questions load
        const newAnswers: Record<string, { selected?: string; correct?: boolean }> = {};
        (data?.questions || []).forEach((q: any) => {
          newAnswers[q.id] = {};
        });
        setAnswers(newAnswers);
        setLoadingQuestions(false);
      })
      .catch((err) => {
        console.error("Error fetching questions:", err);
        setError("Failed to load questions");
        setLoadingQuestions(false);
      });
  }, [selected, config]);

  function handleMcqSelect(q: any, option: string) {
    const correct = option === q.correctAnswer;
    setAnswers((prev) => ({ ...prev, [q.id]: { selected: option, correct } }));
  }

  function handleShortSubmit(q: any, value: string) {
    const normalize = (s: string) => s.trim().toLowerCase();
    const correct = normalize(value) === normalize(q.correctAnswer || "");
    setAnswers((prev) => ({ ...prev, [q.id]: { selected: value, correct } }));
  }

  if (!config && !error) return <p>Loading configuration...</p>;
  if (loadingSubjects) return <p>Loading subjects...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Quiz App</h1>
      <h2>Subjects</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul>
        {subjects.map((s) => (
          <li key={s}>
            <button onClick={() => setSelected(s)} style={{ cursor: "pointer" }}>
              {s}
            </button>
          </li>
        ))}
      </ul>

      <h2>Questions</h2>
      {selected ? (
        <div>
          <p>Selected: {selected}</p>
          {loadingQuestions ? (
            <p>Loading questions...</p>
          ) : questions ? (
            <div>
              {(questions.questions || []).map((q: any) => {
                const ans = answers[q.id] || {};
                return (
                  <div key={q.id} style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ddd', borderRadius: 6 }}>
                    <p style={{ fontWeight: 600 }}>{q.prompt}</p>
                    {q.type === 'mcq' && (
                      <div>
                        {q.options.map((opt: string) => {
                          const selected = ans.selected === opt;
                          const isCorrect = ans.correct && selected;
                          const isIncorrect = ans.selected && !ans.correct && selected;
                          return (
                            <button
                              key={opt}
                              onClick={() => handleMcqSelect(q, opt)}
                              disabled={!!ans.selected}
                              style={{
                                display: 'block',
                                margin: '6px 0',
                                padding: '8px 12px',
                                cursor: ans.selected ? 'default' : 'pointer',
                                background: isCorrect ? '#d4f8d4' : isIncorrect ? '#ffd6d6' : '#fff',
                                border: '1px solid #ccc',
                                borderRadius: 4,
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                        {ans.selected && (
                          <div style={{ marginTop: 8 }}>
                            <p style={{ margin: 0 }}>
                              {ans.correct ? (
                                <span style={{ color: 'green', fontWeight: 600 }}>Correct</span>
                              ) : (
                                <span style={{ color: 'red', fontWeight: 600 }}>Incorrect</span>
                              )}
                            </p>
                            {q.explanation && <p style={{ marginTop: 6 }}>{q.explanation}</p>}
                          </div>
                        )}
                      </div>
                    )}

                    {q.type === 'short' && (
                      <div>
                        {!ans.selected ? (
                          <ShortAnswerInput onSubmit={(v: string) => handleShortSubmit(q, v)} />
                        ) : (
                          <div>
                            {ans.correct ? (
                              <span style={{ color: 'green', fontWeight: 600 }}>Correct</span>
                            ) : (
                              <span style={{ color: 'red', fontWeight: 600 }}>Incorrect — correct answer: {q.correctAnswer}</span>
                            )}
                            {q.explanation && <p style={{ marginTop: 6 }}>{q.explanation}</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p>No questions loaded</p>
          )}
        </div>
      ) : (
        <p>Click a subject to load its questions.</p>
      )}
    </div>
  );
}

export default App;

function ShortAnswerInput({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Type your answer" style={{ padding: '8px', width: '60%' }} />
      <button onClick={() => onSubmit(value)} style={{ marginLeft: 8, padding: '8px 12px' }}>Submit</button>
    </div>
  );
}

