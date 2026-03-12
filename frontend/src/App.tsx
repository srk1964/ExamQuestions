import { useEffect, useState } from "react";
import { Trophy, CheckCircle, XCircle } from "lucide-react";

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
  const [showStats, setShowStats] = useState(false);

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
  const scorePercent = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;

  if (!config && !error) return <p>Loading configuration...</p>;
  if (loadingSubjects) return <p>Loading subjects...</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-center mb-2">Quiz App</h1>
        <p className="text-center text-gray-500">Select a subject and answer the questions.</p>
      </header>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Subjects</h2>
        {error && <p className="text-red-600">{error}</p>}
        <ul className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <li key={s}>
              <button
                onClick={() => {
                  setSelected(s);
                  setShowStats(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-2">Questions</h2>
        {selected ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-medium">Selected: {selected}</span>
              {totalQuestions > 0 && (
                <button
                  onClick={() => setShowStats((v) => !v)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showStats ? 'Hide stats' : 'Show stats'}
                </button>
              )}
            </div>

            {showStats && totalQuestions > 0 && (
              <div className="mb-4 p-4 bg-gray-100 rounded">
                <p className="font-semibold flex items-center gap-1"> <Trophy className="w-5 h-5 text-yellow-500" /> Progress</p>
                <div className="w-full bg-gray-200 rounded h-2 my-2">
                  <div
                    className="bg-green-500 h-2 rounded"
                    style={{ width: `${scorePercent}%` }}
                  ></div>
                </div>
                <p className="text-sm flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {answeredCount} / {totalQuestions} answered ({scorePercent}% correct)
                </p>
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Correct: {correctCount}
                </p>
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  Incorrect: {incorrectCount}
                </p>
              </div>
            )}

            {loadingQuestions ? (
              <p>Loading questions...</p>
            ) : questions ? (
              <div className="space-y-6">
                {(questions.questions || []).map((q: any) => {
                  const ans = answers[q.id] || {};
                  return (
                    <div
                      key={q.id}
                      className="p-4 border rounded shadow-sm bg-white dark:bg-gray-800"
                    >
                      <p className="font-semibold mb-2">{q.prompt}</p>
                      {q.type === 'mcq' && (
                        <div className="space-y-2">
                          {q.options.map((opt: string) => {
                            const selected = ans.selected === opt;
                            const isCorrect = ans.correct && selected;
                            const isIncorrect = ans.selected && !ans.correct && selected;
                            return (
                              <button
                                key={opt}
                                onClick={() => handleMcqSelect(q, opt)}
                                disabled={!!ans.selected}
                                className={`w-full text-left px-3 py-2 border rounded transition-colors ` +
                                  (isCorrect
                                    ? 'bg-green-100 border-green-400'
                                    : isIncorrect
                                    ? 'bg-red-100 border-red-400'
                                    : 'bg-white hover:bg-gray-50')}
                              >
                                {opt}
                              </button>
                            );
                          })}
                          {ans.selected && (
                            <div className="mt-2">
                              <p className="m-0">
                                {ans.correct ? (
                                  <span className="text-green-600 font-semibold">Correct</span>
                                ) : (
                                  <span className="text-red-600 font-semibold">Incorrect</span>
                                )}
                              </p>
                              {q.explanation && <p className="mt-2">{q.explanation}</p>}
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
                                <span className="text-green-600 font-semibold">Correct</span>
                              ) : (
                                <span className="text-red-600 font-semibold">
                                  Incorrect — correct answer: {q.correctAnswer}
                                </span>
                              )}
                              {q.explanation && <p className="mt-2">{q.explanation}</p>}
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
      </section>
    </div>
  );
}

export default App;

function ShortAnswerInput({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your answer"
        className="flex-1 px-3 py-2 border rounded"
      />
      <button
        onClick={() => onSubmit(value)}
        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Submit
      </button>
    </div>
  );
}

