import React from 'react';
import Plot from 'react-plotly.js';

const WaterfallPlot3D = ({ allWebhookData }) => {
  console.log('WaterfallPlot3D received data:', allWebhookData);
  
  if (!allWebhookData || allWebhookData.length === 0) {
    return (
      <div style={{ 
        border: '1px solid #ddd', 
        padding: '20px', 
        borderRadius: '5px',
        backgroundColor: '#f9f9f9',
        textAlign: 'center'
      }}>
        <p>Waiting for impedance data for waterfall plot... (Count: {allWebhookData ? allWebhookData.length : 0})</p>
      </div>
    );
  }

  // Create waterfall plot data
  // X: log10(Frequency), Y: Spectrum Number, Z: -Z_imag (like Python code)
  const x = []; // log10(frequencies)
  const y = []; // spectrum numbers  
  const z = []; // -Z_imag values
  const colors = []; // for coloring

  // Generate frequencies matching the EIS generator (100kHz to 0.01Hz, 50 points)
  const generateLogFrequencies = (numPoints = 50) => {
    const frequencies = [];
    const logStart = 5.0;  // log10(100000) = 5 (100 kHz)
    const logEnd = -2.0;   // log10(0.01) = -2 (0.01 Hz)
    
    for (let i = 0; i < numPoints; i++) {
      const logFreq = logStart + i * (logEnd - logStart) / (numPoints - 1);
      frequencies.push(Math.pow(10, logFreq));
    }
    return frequencies;
  };

  allWebhookData.forEach((measurement, spectrumIndex) => {
    const { ImaginaryImpedance } = measurement;
    
    console.log(`Waterfall Spectrum ${spectrumIndex}:`, {
      hasImagImp: !!ImaginaryImpedance,
      imagLength: ImaginaryImpedance?.length,
      sampleImag: ImaginaryImpedance?.slice(0, 3)
    });
    
    if (ImaginaryImpedance && ImaginaryImpedance.length > 0) {
      // Generate frequencies for this spectrum
      const frequencies = generateLogFrequencies(ImaginaryImpedance.length);
      
      for (let freqIndex = 0; freqIndex < ImaginaryImpedance.length; freqIndex++) {
        const freq = frequencies[freqIndex];
        const imagVal = ImaginaryImpedance[freqIndex];
        
        if (typeof freq === 'number' && typeof imagVal === 'number' && !isNaN(freq) && !isNaN(imagVal) && freq > 0) {
          x.push(Math.log10(freq)); // Log frequency for X-axis
          y.push(spectrumIndex); // Spectrum number for Y-axis
          const zImag = -imagVal; // Negative imaginary impedance
          z.push(zImag); // Height
          colors.push(zImag); // Color based on Z value
        }
      }
    }
  });
  
  console.log('Waterfall plot arrays:', {
    xLength: x.length,
    yLength: y.length, 
    zLength: z.length,
    sampleX: x.slice(0, 5),
    sampleY: y.slice(0, 5),
    sampleZ: z.slice(0, 5)
  });

  const data = [{
    x: x,
    y: y, 
    z: z,
    mode: 'markers',
    type: 'scatter3d',
    marker: {
      size: 2,
      color: colors,
      colorscale: 'Viridis',
      colorbar: {
        title: "-Z'' [Ω]",
        titleside: "right"
      }
    },
    name: 'Waterfall EIS'
  }];

  const layout = {
    title: 'Wykres 3D "Wodospadowy" dla danych DEIS',
    scene: {
      xaxis: {
        title: "log(Częstotliwość / Hz)"
      },
      yaxis: {
        title: "Numer widma"
      },
      zaxis: {
        title: "-Z'' / Ω"
      },
      camera: {
        eye: { x: 1.5, y: -1.2, z: 1.5 } // Similar to Python's view_init(elev=30, azim=-120)
      }
    },
    margin: { l: 0, r: 0, b: 0, t: 50 },
    height: 600
  };

  const config = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d']
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ marginBottom: '10px', fontSize: '12px', backgroundColor: '#e8f5e8', padding: '10px' }}>
        <strong>Waterfall Plot Info:</strong> {allWebhookData.length} spectra, {x.length} total data points
        <br />
        <strong>Frequency range:</strong> {x.length > 0 ? `${Math.min(...x).toFixed(2)} - ${Math.max(...x).toFixed(2)} log(Hz)` : 'N/A'}
        <br />
        <strong>Z'' range:</strong> {z.length > 0 ? `${Math.min(...z).toFixed(3)} - ${Math.max(...z).toFixed(3)} Ω` : 'N/A'}
      </div>
      <Plot
        data={data}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '600px' }}
      />
    </div>
  );
};

export default WaterfallPlot3D;