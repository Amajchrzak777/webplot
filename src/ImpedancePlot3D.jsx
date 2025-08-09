import React from 'react';
import Plot from 'react-plotly.js';
import Plotly from 'plotly.js-dist-min';

const ImpedancePlot3D = ({ allWebhookData }) => {
  console.log('ImpedancePlot3D received data:', allWebhookData);
  
  // Analyze the data quality
  if (allWebhookData && allWebhookData.length > 0) {
    const firstMeasurement = allWebhookData[0];
    console.log('=== DATA ANALYSIS ===');
    console.log('Chi-Square:', firstMeasurement.ChiSquare);
    console.log('Real Impedance stats:', {
      length: firstMeasurement.RealImpedance?.length,
      min: Math.min(...(firstMeasurement.RealImpedance || [])),
      max: Math.max(...(firstMeasurement.RealImpedance || [])),
      first10: firstMeasurement.RealImpedance?.slice(0, 10),
      allSame: firstMeasurement.RealImpedance?.every(val => val === firstMeasurement.RealImpedance[0])
    });
    console.log('Imaginary Impedance stats:', {
      length: firstMeasurement.ImaginaryImpedance?.length,
      min: Math.min(...(firstMeasurement.ImaginaryImpedance || [])),
      max: Math.max(...(firstMeasurement.ImaginaryImpedance || [])),
      first10: firstMeasurement.ImaginaryImpedance?.slice(0, 10),
      allSame: firstMeasurement.ImaginaryImpedance?.every(val => val === firstMeasurement.ImaginaryImpedance[0])
    });
    console.log('Raw webhook data structure:', firstMeasurement);
  }
  
  if (!allWebhookData || allWebhookData.length === 0) {
    return (
      <div style={{ 
        border: '1px solid #ddd', 
        padding: '20px', 
        borderRadius: '5px',
        backgroundColor: '#f9f9f9',
        textAlign: 'center'
      }}>
        <p>Waiting for impedance data to plot... (Count: {allWebhookData ? allWebhookData.length : 0})</p>
      </div>
    );
  }

  // Create traces for all measurements
  const data = allWebhookData.map((measurement, measurementIndex) => {
    const { RealImpedance, ImaginaryImpedance, Time } = measurement;
    
    // Use negative imaginary impedance for Y-axis (Nyquist plot)
    const negativeImaginaryImpedance = ImaginaryImpedance.map(val => -val);
    
    // Use spectrum count (measurement index) for Z-axis
    const zValue = measurementIndex + 1;
    const zArray = RealImpedance.map(() => zValue);

    return {
      x: RealImpedance,
      y: negativeImaginaryImpedance,
      z: zArray,
      mode: 'markers',
      type: 'scatter3d',
      marker: {
        size: 3,
        color: `hsl(${(measurementIndex * 360) / allWebhookData.length}, 70%, 50%)`,
      },
      name: `Spectrum ${measurementIndex + 1}`,
      showlegend: true
    };
  });

  const layout = {
    title: '3D Impedance Plot (EIS)',
    scene: {
      xaxis: {
        title: "Real Impedance (Z') [Ω]"
      },
      yaxis: {
        title: "Negative Imaginary Impedance (-Z'') [Ω]"
      },
      zaxis: {
        title: 'Spectrum Count',
        type: 'linear'
      },
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.5 }
      },
      aspectmode: 'manual',
      aspectratio: { x: 1, y: 1, z: 0.5 }
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
      <div style={{ marginBottom: '10px', fontSize: '12px', backgroundColor: '#f0f0f0', padding: '10px' }}>
        <strong>Debug Info:</strong> {allWebhookData.length} measurements received
        <br />
        <strong>First measurement:</strong> {allWebhookData[0] ? `ID: ${allWebhookData[0].ID}, Real: ${allWebhookData[0].RealImpedance?.length} points, Imag: ${allWebhookData[0].ImaginaryImpedance?.length} points` : 'None'}
        <br />
        <strong>Sample Real values:</strong> {allWebhookData[0] ? `[${allWebhookData[0].RealImpedance?.slice(0, 5).join(', ')}...]` : 'None'}
        <br />
        <strong>Sample Imag values:</strong> {allWebhookData[0] ? `[${allWebhookData[0].ImaginaryImpedance?.slice(0, 5).join(', ')}...]` : 'None'}
        <br />
        <strong>Spectrum Count:</strong> {allWebhookData.length} spectra
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

export default ImpedancePlot3D;