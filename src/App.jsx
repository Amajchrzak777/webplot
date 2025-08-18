import { useState, useEffect } from 'react';
import ImpedancePlot3D from './ImpedancePlot3D';
import WaterfallPlot3D from './WaterfallPlot3D';
import ParameterEvolutionPlot2D from './ParameterEvolutionPlot2D';

function App() {
  const [webhookData, setWebhookData] = useState(null);
  const [allWebhookData, setAllWebhookData] = useState([]);
  const [dataSource, setDataSource] = useState('webhook'); // 'webhook' or 'csv'
  const [csvData, setCsvData] = useState([]);
  const [showNyquistPlot, setShowNyquistPlot] = useState(true);
  const [showWaterfallPlot, setShowWaterfallPlot] = useState(true);
  const [showParameterEvolutionPlot, setShowParameterEvolutionPlot] = useState(true);

  // Function to parse CSV data and convert to webhook format
  const parseCsvToWebhookFormat = (csvText, fileName = 'unknown') => {
    const lines = csvText.trim().split('\n');
    
    // Check if first line looks like headers or data
    const firstLine = lines[0].split(',');
    const hasHeaders = isNaN(parseFloat(firstLine[0])); // If first column isn't a number, it's probably headers
    
    const startIndex = hasHeaders ? 1 : 0;
    
    // Expected format: Frequency_Hz,Z_real,Z_imag (first column is always frequency)
    const dataBySpectrum = {};
    
    for (let i = startIndex; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < 3) continue; // Skip incomplete lines
      
      const frequency = parseFloat(values[0]);  // First column is always frequency
      const zReal = parseFloat(values[1]);      // Second column is real impedance
      const zImag = parseFloat(values[2]);      // Third column is imaginary impedance
      
      // Skip invalid data
      if (isNaN(frequency) || isNaN(zReal) || isNaN(zImag)) continue;
      
      // If there's a 4th column, use it as spectrum number, otherwise treat as single spectrum
      const spectrumNumber = values.length >= 4 ? parseInt(values[3]) : 1;
      
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
      const baseFileName = fileName.replace('.csv', '').replace(/[^a-zA-Z0-9_]/g, '_');
      return {
        ID: `${baseFileName}_spectrum_${spectrumNum}`,
        Time: new Date().toISOString(), // Current timestamp
        ChiSquare: null, // N/A - no theoretical model data available
        RealImpedance: spectrum.realImpedance,
        ImaginaryImpedance: spectrum.imaginaryImpedance,
        BytesLength: null, // Not applicable for CSV data
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
        const parsedData = parseCsvToWebhookFormat(csvText, file.name);
        setCsvData(parsedData);
        console.log(`Loaded ${parsedData.length} spectra from CSV file: ${file.name}`);
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
              Expected CSV format: Frequency_Hz,Z_real,Z_imag (first column is always frequency)
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
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
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
          <label>
            <input
              type="checkbox"
              checked={showParameterEvolutionPlot}
              onChange={(e) => setShowParameterEvolutionPlot(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Circuit Parameter Evolution (2D)
          </label>
        </div>
      </div>
      
      
      {/* Axis Legend */}
      <div style={{ 
        border: '2px solid #6f42c1', 
        padding: '15px', 
        borderRadius: '5px',
        backgroundColor: '#faf8ff',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#6f42c1', margin: '0 0 12px 0' }}>📊 Axis Legend & Plot Types</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
          {/* Nyquist Plot Axes */}
          <div style={{ 
            backgroundColor: '#fff', 
            padding: '12px', 
            borderRadius: '5px',
            border: '1px solid #e1d5f4'
          }}>
            <h4 style={{ color: '#007bff', margin: '0 0 8px 0' }}>🟦 Nyquist Plot (3D EIS)</h4>
            <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
              <div><strong>X-axis:</strong> Z' (Real Impedance) [Ω]</div>
              <div><strong>Y-axis:</strong> Spectrum Number</div>
              <div><strong>Z-axis:</strong> Z'' (Imaginary Impedance) [Ω]</div>
              <div style={{ marginTop: '6px', fontStyle: 'italic', color: '#666' }}>
                Shows impedance evolution across spectra in complex plane
              </div>
            </div>
          </div>
          
          {/* Waterfall Plot Axes */}
          <div style={{ 
            backgroundColor: '#fff', 
            padding: '12px', 
            borderRadius: '5px',
            border: '1px solid #e1d5f4'
          }}>
            <h4 style={{ color: '#28a745', margin: '0 0 8px 0' }}>🟩 Waterfall Plot (3D Frequency)</h4>
            <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
              <div><strong>X-axis:</strong> log₁₀(Frequency) [Hz]</div>
              <div><strong>Y-axis:</strong> Spectrum Number</div>
              <div><strong>Z-axis:</strong> |Z| (Impedance Magnitude) [Ω]</div>
              <div style={{ marginTop: '6px', fontStyle: 'italic', color: '#666' }}>
                Shows frequency response evolution with magnitude coloring
              </div>
            </div>
          </div>

          {/* Parameter Evolution Plots */}
          <div style={{ 
            backgroundColor: '#fff', 
            padding: '12px', 
            borderRadius: '5px',
            border: '1px solid #e1d5f4'
          }}>
            <h4 style={{ color: '#e83e8c', margin: '0 0 8px 0' }}>🔬 Circuit Parameter Evolution (2D)</h4>
            <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
              <div><strong>X-axis:</strong> Spectrum Number</div>
              <div><strong>Y-axis:</strong> Parameter Value [Ω], [F], or [S⋅s^n]</div>
              <div><strong>Parameters:</strong> R₁, R₂ (resistances), C (capacitance), Q, n (CPE)</div>
              <div style={{ marginTop: '6px', fontStyle: 'italic', color: '#666' }}>
                Shows evolution of circuit parameters (R(CR), R(QR), etc.) from goimpcore fitting
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Render plots based on checkboxes */}
      {showNyquistPlot && <ImpedancePlot3D allWebhookData={plotData} />}
      {showWaterfallPlot && <WaterfallPlot3D allWebhookData={plotData} />}
      {showParameterEvolutionPlot && plotData.length > 0 && (
        <ParameterEvolutionPlot2D allSpectra={plotData} />
      )}
    </div>
  );
}

export default App;