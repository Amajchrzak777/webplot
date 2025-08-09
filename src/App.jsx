import { useState, useEffect } from 'react';
import ImpedancePlot3D from './ImpedancePlot3D';

function App() {
  const [webhookData, setWebhookData] = useState(null);
  const [allWebhookData, setAllWebhookData] = useState([]);

  useEffect(() => {
    const fetchWebhookData = async () => {
      try {
        const [latestResponse, allResponse] = await Promise.all([
          fetch('http://localhost:3001/latest-webhook'),
          fetch('http://localhost:3001/all-webhooks')
        ]);
        const latestData = await latestResponse.json();
        const allData = await allResponse.json();
        setWebhookData(latestData);
        setAllWebhookData(allData);
      } catch (error) {
        console.error('Error fetching webhook data:', error);
      }
    };

    fetchWebhookData();
    const interval = setInterval(fetchWebhookData, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>WebPlot - Webhook Monitor</h1>
      
      {webhookData && webhookData.ID ? (
        <div style={{ 
          border: '1px solid #ccc', 
          padding: '15px', 
          borderRadius: '5px',
          backgroundColor: '#f9f9f9'
        }}>
          <h2>Latest Webhook Data</h2>
          <p><strong>ID:</strong> {webhookData.ID}</p>
          <p><strong>Time:</strong> {new Date(webhookData.Time).toLocaleString()}</p>
          <p><strong>Chi-Square:</strong> {webhookData.ChiSquare?.toFixed(12)}</p>
          <p><strong>Real Impedance:</strong> [{webhookData.RealImpedance?.map(val => val.toFixed(3)).join(', ')}]</p>
          <p><strong>Imaginary Impedance:</strong> [{webhookData.ImaginaryImpedance?.map(val => val.toFixed(3)).join(', ')}]</p>
          <p><strong>Bytes Received:</strong> {webhookData.BytesLength}</p>
        </div>
      ) : (
        <div style={{ 
          border: '1px solid #ddd', 
          padding: '15px', 
          borderRadius: '5px',
          backgroundColor: '#fff3cd'
        }}>
          <p>Waiting for webhook data...</p>
          <p>Send POST request with bytes to: <code>http://localhost:3001/webhook</code></p>
        </div>
      )}
      
      <ImpedancePlot3D allWebhookData={allWebhookData} />
    </div>
  );
}

export default App;