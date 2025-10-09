import { useEffect, useState } from "react";

function App() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [questions, setQuestions] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const apiBase = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const url = `${apiBase}/list-subjects`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setSubjects(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching subjects:", err);
        setLoading(false);
      });
  }, [apiBase]);

  useEffect(() => {
    // When subjects arrive, fetch questions for the first subject (if any)
    if (subjects.length > 0) {
      const subject = subjects[0];
      const url = `${apiBase}/list-subjects?subject=${encodeURIComponent(subject)}`;
      fetch(url)
        .then((res) => res.json())
        .then((data) => setQuestions(data))
        .catch((err) => console.error("Error fetching questions:", err));
    }
  }, [subjects, apiBase]);

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Quiz App</h1>
      <h2>Subjects</h2>
      <ul>
        {subjects.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>

      <h2>Questions (first subject)</h2>
      <pre>{questions ? JSON.stringify(questions, null, 2) : "No questions loaded"}</pre>
    </div>
  );
}

export default App;

