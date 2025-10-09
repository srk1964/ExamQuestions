import { useEffect, useState } from "react";

interface Config {
  VITE_API_URL: string;
}

function App() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any>(null);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    // Fetch config.json from the root of the site
    fetch("/config.json")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => {
        console.error("Failed to load config:", err);
        setError("Failed to load app configuration");
      });
  }, []);

  useEffect(() => {
    if (!config) return;
    setLoadingSubjects(true);
    const url = `${config.VITE_API_URL}/list-subjects`;
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
        setLoadingQuestions(false);
      })
      .catch((err) => {
        console.error("Error fetching questions:", err);
        setError("Failed to load questions");
        setLoadingQuestions(false);
      });
  }, [selected, config]);

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

