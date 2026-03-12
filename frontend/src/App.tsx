import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

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
  const [, setShowStats] = useState(false);

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

  // statistics helpers
  const totalQuestions = questions?.questions?.length || 0;
  const answeredCount = Object.values(answers).filter((a) => a.selected !== undefined).length;
  const correctCount = Object.values(answers).filter((a) => a.correct).length;
  const incorrectCount = answeredCount - correctCount;
  // additional derived stats for sidebar
  const completePercent = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const currentGrade = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;

  if (!config && !error) return <p>Loading configuration...</p>;
  if (loadingSubjects) return <p>Loading subjects...</p>;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '56rem', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem', borderRadius: '1rem', color: 'white' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0 0 0.5rem', textAlign: 'center' }}>Quiz App</h1>
        <p style={{ margin: 0, textAlign: 'center', fontSize: '1.1rem', opacity: 0.9 }}>Test your knowledge with interactive quizzes</p>
      </header>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>📚 Select a Subject</h2>
        {error && <p style={{ color: '#dc2626', padding: '1rem', backgroundColor: '#fee2e2', borderRadius: '0.5rem' }}>{error}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSelected(s);
                setShowStats(false);
              }}
              style={{
                padding: '1rem',
                backgroundColor: selected === s ? '#2563eb' : '#f0f9ff',
                color: selected === s ? 'white' : '#0284c7',
                border: `2px solid ${selected === s ? '#1d4ed8' : '#bfdbfe'}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                if (selected !== s) (e.target as HTMLButtonElement).style.backgroundColor = '#dbeafe';
              }}
              onMouseOut={(e) => {
                if (selected !== s) (e.target as HTMLButtonElement).style.backgroundColor = '#f0f9ff';
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>❓ Questions</h2>
        {selected ? (
          totalQuestions > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '2rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151' }}>Subject: <strong style={{ color: '#2563eb' }}>{selected}</strong></span>
                </div>

                {loadingQuestions ? (
                  <p style={{ textAlign: 'center', color: '#6b7280' }}>⏳ Loading questions...</p>
                ) : questions ? (
                  <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {(questions.questions || []).map((q: any) => {
                      const ans = answers[q.id] || {};
                      return (
                        <div
                          key={q.id}
                          style={{
                            padding: '1.5rem',
                            border: `2px solid ${ans.selected ? ans.correct ? '#10b981' : '#ef4444' : '#e5e7eb'}`,
                            borderRadius: '0.75rem',
                            backgroundColor: ans.selected ? ans.correct ? '#f0fdf4' : '#fef2f2' : 'white',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s',
                          }}
                        >
                          <p style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '1rem', color: '#1f2937' }}>{q.prompt}</p>

                          {q.type === 'mcq' && (
                            <div>
                              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
                                {q.options.map((opt: string) => {
                                  const isSelected = ans.selected === opt;
                                  const isCorrect = ans.correct && isSelected;
                                  const isIncorrect = ans.selected && !ans.correct && isSelected;
                                  return (
                                    <button
                                      key={opt}
                                      onClick={() => handleMcqSelect(q, opt)}
                                      disabled={!!ans.selected}
                                      style={{
                                        textAlign: 'left',
                                        padding: '1rem',
                                        backgroundColor: isCorrect ? '#d1fae5' : isIncorrect ? '#fee2e2' : '#f9fafb',
                                        border: `2px solid ${isCorrect ? '#10b981' : isIncorrect ? '#ef4444' : '#e5e7eb'}`,
                                        borderRadius: '0.5rem',
                                        cursor: ans.selected ? 'default' : 'pointer',
                                        fontWeight: isSelected ? '600' : '500',
                                        fontSize: '1rem',
                                        color: '#1f2937',
                                        transition: 'all 0.2s',
                                        opacity: ans.selected && !isSelected ? 0.5 : 1,
                                      }}
                                      onMouseOver={(e) => {
                                        if (!ans.selected) (e.target as HTMLButtonElement).style.backgroundColor = '#f3f4f6';
                                      }}
                                      onMouseOut={(e) => {
                                        if (!ans.selected) (e.target as HTMLButtonElement).style.backgroundColor = '#f9fafb';
                                      }}
                                    >
                                      {isSelected && (
                                        <span style={{ marginRight: '0.5rem' }}>{isCorrect ? '✓' : '✗'}</span>
                                      )}
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>

                              {ans.selected && (
                                <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem', border: `1px solid ${ans.correct ? '#10b981' : '#ef4444'}` }}>
                                  <p style={{ margin: '0 0 0.5rem', fontWeight: 'bold', color: ans.correct ? '#10b981' : '#ef4444', fontSize: '1.1rem' }}>
                                    {ans.correct ? '✓ Correct!' : '✗ Incorrect'}
                                  </p>
                                  {q.explanation && <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>{q.explanation}</p>}
                                </div>
                              )}
                            </div>
                          )}

                          {q.type === 'short' && (
                            <div>
                              {!ans.selected ? (
                                <ShortAnswerInput onSubmit={(v: string) => handleShortSubmit(q, v)} />
                              ) : (
                                <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem', border: `1px solid ${ans.correct ? '#10b981' : '#ef4444'}` }}>
                                  <p style={{ margin: '0 0 0.5rem', fontWeight: 'bold', color: ans.correct ? '#10b981' : '#ef4444', fontSize: '1.1rem' }}>
                                    {ans.correct ? '✓ Correct!' : '✗ Incorrect'}
                                  </p>
                                  {!ans.correct && <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.95rem' }}>Correct answer: <strong>{q.correctAnswer}</strong></p>}
                                  {q.explanation && <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.95rem' }}>{q.explanation}</p>}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: '#6b7280' }}>No questions loaded</p>
                )}
              </div>
              <aside style={{ position: 'sticky', top: '2rem', alignSelf: 'start' }}>
                <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '0.75rem', border: '2px solid #86efac', minWidth: '220px' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '0.75rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Trophy style={{ width: '1.5rem', height: '1.5rem', color: '#fbbf24' }} /> Stats
                  </p>
                  <p style={{ margin: '0.25rem 0' }}>Complete: <strong>{completePercent}%</strong></p>
                  <p style={{ margin: '0.25rem 0' }}>Grade: <strong>{currentGrade}%</strong></p>
                  <p style={{ margin: '0.25rem 0' }}>Answered: {answeredCount}/{totalQuestions}</p>
                  <p style={{ margin: '0.25rem 0' }}>Correct: {correctCount}</p>
                  {incorrectCount > 0 && <p style={{ margin: '0.25rem 0', color: '#dc2626' }}>Incorrect: {incorrectCount}</p>}
                </div>
              </aside>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>No questions loaded</p>
          )
        ) : (
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '1.1rem', padding: '2rem' }}>👆 Click a subject above to get started!</p>
        )}
      </section>
    </div>
  );
}

export default App;

function ShortAnswerInput({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div style={{ display: 'flex', gap: '0.75rem' }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter') onSubmit(value);
        }}
        placeholder="Type your answer..."
        style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}
      />
      <button
        onClick={() => onSubmit(value)}
        style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}
      >
        Submit
      </button>
    </div>
  );
}

