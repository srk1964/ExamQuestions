import { useEffect, useState } from "react";

function App() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any>(null);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = import.meta.env.VITE_API_URL;

  useEffect(() => {
    setLoadingSubjects(true);
    const url = `${apiBase}/list-subjects`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setSubjects(data || []);
        setLoadingSubjects(false);
      })
      .catch((err) => {
        console.error("Error fetching subjects:", err);
        setError("Failed to load subjects");
        setLoadingSubjects(false);
      });
  }, [apiBase]);

  useEffect(() => {
    if (!selected) return;
    setLoadingQuestions(true);
    setError(null);
    const url = `${apiBase}/list-subjects?subject=${encodeURIComponent(selected)}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data);
        setLoadingQuestions(false);
      })
      .catch((err) => {
        console.error("Error fetching questions:", err);
        setError("Failed to load questions");
        setLoadingQuestions(false);
      });
  }, [selected, apiBase]);

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
            <pre>{JSON.stringify(questions, null, 2)}</pre>
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

