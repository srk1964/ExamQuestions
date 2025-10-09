import { useEffect, useState } from "react";

function App() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/list-subjects`)
      .then(res => res.json())
      .then(data => setSubjects(data))
      .catch(err => console.error("Error fetching subjects:", err));
  }, []);


  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: "2rem" }}>
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

