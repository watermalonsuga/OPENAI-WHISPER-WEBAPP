import React, { useEffect, useState } from 'react';
import axios from 'axios';

function SummaryView({ recordingId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = () => {
    setLoading(true);
    axios.get(`http://localhost:5000/api/summaries/${recordingId}`)
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSummary();
  }, [recordingId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await axios.post(`http://localhost:5000/api/summaries/${recordingId}/generate`);
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to generate summary:', err);
      setError(err.response?.data?.error || 'Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <p>Loading summary...</p>;

  return (
    <div className="summary-view">
      <h3>Summary</h3>

      {!summary && (
        <div>
          <p className="summary-empty">No summary available yet.</p>
          <button className="btn-generate" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Regenerating...' : 'Regenerate summary'}
          </button>
        </div>
      )}
      {error && <p className="summary-error">{error}</p>}

      {summary && (
        <>
          <p>{summary.summary}</p>

          {summary.keyPoints?.length > 0 && (
            <>
              <h4>Key Points</h4>
              <ul>
                {summary.keyPoints.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            </>
          )}

          {summary.actionItems?.length > 0 && (
            <>
              <h4>Action Items</h4>
              <ul>
                {summary.actionItems.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </>
          )}

          <button className="btn-generate" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Regenerating...' : 'Regenerate summary'}
          </button>
        </>
      )}
    </div>
  );
}

export default SummaryView;