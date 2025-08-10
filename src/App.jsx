import { useState, useEffect } from 'react';
import ImpedancePlot3D from './ImpedancePlot3D';
import WaterfallPlot3D from './WaterfallPlot3D';

function App() {
  const [webhookData, setWebhookData] = useState(null);
  const [allWebhookData, setAllWebhookData] = useState([]);
  const [dataSource, setDataSource] = useState('webhook'); // 'webhook' or 'csv'
  const [csvData, setCsvData] = useState([]);
  const [showNyquistPlot, setShowNyquistPlot] = useState(true);
  const [showWaterfallPlot, setShowWaterfallPlot] = useState(true);

  // Function to parse CSV data and convert to webhook format
  const parseCsvToWebhookFormat = (csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    
    // Expected headers: Z_real,Z_imag,Spectrum_Number,Frequency_Hz
    const dataBySpectrum = {};
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const zReal = parseFloat(values[0]);
      const zImag = parseFloat(values[1]);
      const spectrumNumber = parseInt(values[2]);
      const frequency = parseFloat(values[3]);
      
      if (!dataBySpectrum[spectrumNumber]) {
        dataBySpectrum[spectrumNumber] = {
          frequencies: [],
          realImpedance: [],
          imaginaryImpedance: []
        };
      }
      
      dataBySpectrum[spectrumNumber].frequencies.push(frequency);
      dataBySpectrum[spectrumNumber].realImpedance.push(zReal);
      dataBySpectrum[spectrumNumber].imaginaryImpedance.push(zImag);
    }
    
    // Convert to webhook format
    const webhookFormatData = Object.keys(dataBySpectrum).map((spectrumNum, index) => {
      const spectrum = dataBySpectrum[spectrumNum];
      return {
        ID: `csv_spectrum_${spectrumNum}`,
        Time: new Date(Date.now() + index * 1000).toISOString(), // Simulate time progression
        ChiSquare: Math.random() * 0.01, // Simulated chi-square
        RealImpedance: spectrum.realImpedance,
        ImaginaryImpedance: spectrum.imaginaryImpedance,
        BytesLength: spectrum.realImpedance.length * 16, // Simulated
        Frequencies: spectrum.frequencies
      };
    });
    
    console.log('Parsed CSV data:', webhookFormatData);
    return webhookFormatData;
  };

  // Sort webhook data by iteration number extracted from ID
  const sortWebhookDataByIteration = (data) => {
    return [...data].sort((a, b) => {
      // Extract iteration number from ID format: "{id}_iter_{003}"
      const extractIteration = (id) => {
        const match = id.match(/_iter_(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };
      
      const iterA = extractIteration(a.ID || '');
      const iterB = extractIteration(b.ID || '');
      
      console.log(`Sorting: ${a.ID} (iter ${iterA}) vs ${b.ID} (iter ${iterB})`);
      return iterA - iterB;
    });
  };

  // Handle CSV file upload
  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvText = e.target.result;
        const parsedData = parseCsvToWebhookFormat(csvText);
        setCsvData(parsedData);
        console.log(`Loaded ${parsedData.length} spectra from CSV`);
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    if (dataSource !== 'webhook') return;
    
    const fetchWebhookData = async () => {
      try {
        const [latestResponse, allResponse] = await Promise.all([
          fetch('http://localhost:3001/latest-webhook'),
          fetch('http://localhost:3001/all-webhooks')
        ]);
        const latestData = await latestResponse.json();
        const allData = await allResponse.json();
        
        // Sort all webhook data by iteration number for proper plot ordering
        const sortedAllData = sortWebhookDataByIteration(allData);
        
        setWebhookData(latestData);
        setAllWebhookData(sortedAllData);
        
        console.log(`Fetched and sorted ${sortedAllData.length} webhook entries`);
      } catch (error) {
        console.error('Error fetching webhook data:', error);
      }
    };

    fetchWebhookData();
    const interval = setInterval(fetchWebhookData, 2000);

    return () => clearInterval(interval);
  }, [dataSource]);

  // Determine which data to use for plotting
  const plotData = dataSource === 'csv' ? csvData : allWebhookData;
  const currentData = dataSource === 'csv' ? csvData[0] : webhookData;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>WebPlot - Data Visualization</h1>
      
      {/* Data Source Selector */}
      <div style={{ 
        border: '2px solid #007bff', 
        padding: '15px', 
        borderRadius: '5px',
        backgroundColor: '#f8f9fa',
        marginBottom: '20px'
      }}>
        <h3>Data Source</h3>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ marginRight: '20px' }}>
            <input
              type="radio"
              value="webhook"
              checked={dataSource === 'webhook'}
              onChange={(e) => setDataSource(e.target.value)}
              style={{ marginRight: '5px' }}
            />
            Live Webhook Data
          </label>
          <label>
            <input
              type="radio"
              value="csv"
              checked={dataSource === 'csv'}
              onChange={(e) => setDataSource(e.target.value)}
              style={{ marginRight: '5px' }}
            />
            CSV File Data
          </label>
        </div>
        
        {dataSource === 'csv' && (
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              style={{ marginBottom: '10px' }}
            />
            <p style={{ fontSize: '12px', color: '#666' }}>
              Expected CSV format: Z_real,Z_imag,Spectrum_Number,Frequency_Hz
            </p>
            {csvData.length > 0 && (
              <p style={{ color: '#28a745', fontWeight: 'bold' }}>
                ✅ Loaded {csvData.length} spectra from CSV
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Data Display */}
      {dataSource === 'webhook' ? (
        // Webhook data display
        currentData && currentData.ID ? (
          <div style={{ 
            border: '1px solid #ccc', 
            padding: '15px', 
            borderRadius: '5px',
            backgroundColor: '#f9f9f9'
          }}>
            <h2>Latest Webhook Data</h2>
            <p><strong>ID:</strong> {currentData.ID}</p>
            <p><strong>Iteration:</strong> {(() => {
              const match = currentData.ID?.match(/_iter_(\d+)/);
              return match ? parseInt(match[1], 10) : 'N/A';
            })()}</p>
            <p><strong>Time:</strong> {new Date(currentData.Time).toLocaleString()}</p>
            <p><strong>Chi-Square:</strong> {currentData.ChiSquare?.toFixed(12)}</p>
            <p><strong>Real Impedance:</strong> [{currentData.RealImpedance?.slice(0,5).map(val => val.toFixed(3)).join(', ')}...]</p>
            <p><strong>Imaginary Impedance:</strong> [{currentData.ImaginaryImpedance?.slice(0,5).map(val => val.toFixed(3)).join(', ')}...]</p>
            <p><strong>Total Spectra:</strong> {allWebhookData.length}</p>
            <p><strong>Iteration Range:</strong> {(() => {
              if (allWebhookData.length === 0) return 'N/A';
              const iterations = allWebhookData.map(item => {
                const match = item.ID?.match(/_iter_(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
              });
              const min = Math.min(...iterations);
              const max = Math.max(...iterations);
              return min === max ? `${min}` : `${min}-${max}`;
            })()}</p>
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
        )
      ) : (
        // CSV data display
        csvData.length > 0 ? (
          <div style={{ 
            border: '1px solid #ccc', 
            padding: '15px', 
            borderRadius: '5px',
            backgroundColor: '#e8f5e8'
          }}>
            <h2>CSV Data Summary</h2>
            <p><strong>Total Spectra:</strong> {csvData.length}</p>
            <p><strong>First Spectrum ID:</strong> {csvData[0]?.ID}</p>
            <p><strong>Sample Chi-Square:</strong> {csvData[0]?.ChiSquare?.toFixed(6)}</p>
            <p><strong>Data Points per Spectrum:</strong> {csvData[0]?.RealImpedance?.length}</p>
            <p><strong>Real Impedance Range:</strong> {csvData[0] ? 
              `${Math.min(...csvData[0].RealImpedance).toFixed(3)} - ${Math.max(...csvData[0].RealImpedance).toFixed(3)} Ω` : 'N/A'}</p>
          </div>
        ) : (
          <div style={{ 
            border: '1px solid #ddd', 
            padding: '15px', 
            borderRadius: '5px',
            backgroundColor: '#fff3cd'
          }}>
            <p>Please upload a CSV file to visualize data</p>
          </div>
        )
      )}
      
      {/* Plot Selection Controls */}
      <div style={{ 
        border: '2px solid #28a745', 
        padding: '15px', 
        borderRadius: '5px',
        backgroundColor: '#f8fff8',
        marginBottom: '20px'
      }}>
        <h3>Plot Controls</h3>
        <div style={{ display: 'flex', gap: '20px' }}>
          <label>
            <input
              type="checkbox"
              checked={showNyquistPlot}
              onChange={(e) => setShowNyquistPlot(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Nyquist Plot (3D)
          </label>
          <label>
            <input
              type="checkbox"
              checked={showWaterfallPlot}
              onChange={(e) => setShowWaterfallPlot(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Waterfall Plot (3D)
          </label>
        </div>
      </div>
      
      {/* Render plots based on checkboxes */}
      {showNyquistPlot && <ImpedancePlot3D allWebhookData={plotData} />}
      {showWaterfallPlot && <WaterfallPlot3D allWebhookData={plotData} />}
    </div>
  );
}

export default App;