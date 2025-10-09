import { useEffect, useState } from "react";

function App() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/infra/lambda/list-subjects`)
      .then(res => res.json())
      .then(data => {
        setSubjects(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching subjects:", err);
        setLoading(false);
      });
  }, []);

useEffect(() => {
  if (subjects) {
    fetch(`${import.meta.env.VITE_API_URL}/get-questions?subject=${subjects}`)
      .then(res => res.json())
      .then(data => setLoading(data))
      .catch(err => console.error("Error fetching questions:", err));
  }
}, [subjects]);

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: "2rem" }}>subjects
      <h1>Quiz App</h1>
      <ul>
        {subjects.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;

