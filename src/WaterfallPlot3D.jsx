import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

const WaterfallPlot3D = ({ allWebhookData }) => {
  console.log('WaterfallPlot3D received data:', allWebhookData);
  
  // State to track which spectrum is currently selected (only one visible at a time)
  const [selectedSpectrum, setSelectedSpectrum] = useState(null);
  const [showAllSpectrums, setShowAllSpectrums] = useState(false);
  
  // Show only specific spectrum
  const showOnlySpectrum = (index) => {
    console.log(`Waterfall showOnlySpectrum called with index: ${index}`);
    if (index >= 0 && index < allWebhookData.length) {
      setSelectedSpectrum(index);
      setShowAllSpectrums(false);
    }
  };
  
  // Show all spectrums
  const showAll = () => {
    setShowAllSpectrums(true);
    setSelectedSpectrum(null);
  };
  
  // Hide all spectrums (show empty plot)
  const hideAll = () => {
    setShowAllSpectrums(false);
    setSelectedSpectrum(null);
  };
  
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

  // Calculate axis ranges with 5% padding based on visible spectra
  const calculateAxisRanges = () => {
    let visibleData = [];
    
    if (showAllSpectrums) {
      visibleData = allWebhookData;
    } else if (selectedSpectrum !== null) {
      visibleData = [allWebhookData[selectedSpectrum]];
    } else {
      visibleData = allWebhookData; // Empty plot - use all data for consistent scale
    }
    
    let allFreqValues = [];
    let allMagnitudes = [];
    
    visibleData.forEach(measurement => {
      const { RealImpedance, ImaginaryImpedance, Frequencies } = measurement;
      if (RealImpedance && ImaginaryImpedance && Frequencies) {
        for (let i = 0; i < RealImpedance.length; i++) {
          const magnitude = Math.sqrt(RealImpedance[i] * RealImpedance[i] + ImaginaryImpedance[i] * ImaginaryImpedance[i]);
          allFreqValues.push(Math.log10(Frequencies[i]));
          allMagnitudes.push(magnitude);
        }
      }
    });
    
    if (allFreqValues.length === 0 || allMagnitudes.length === 0) {
      return { xRange: [0, 1], zRange: [0, 1] };
    }
    
    const freqMin = Math.min(...allFreqValues);
    const freqMax = Math.max(...allFreqValues);
    const magMin = Math.min(...allMagnitudes);
    const magMax = Math.max(...allMagnitudes);
    
    const freqRange = freqMax - freqMin;
    const magRange = magMax - magMin;
    
    return {
      xRange: [freqMin - freqRange * 0.10, freqMax + freqRange * 0.10],
      zRange: [magMin - magRange * 0.10, magMax + magRange * 0.10]
    };
  };
  
  const axisRanges = calculateAxisRanges();

  // Create waterfall plot data - filter based on selection
  const data = [];

  allWebhookData.forEach((measurement, spectrumIndex) => {
    // Determine trace visibility like Nyquist plot
    let visible = 'legendonly'; // Default: hidden but in legend
    if (showAllSpectrums) {
      visible = true; // Show all spectrums
    } else if (selectedSpectrum === spectrumIndex) {
      visible = true; // Show only selected spectrum
    }

    const { RealImpedance, ImaginaryImpedance, Frequencies } = measurement;
    
    // Debug: check data structure for waterfall
    if (spectrumIndex === 0) {
      console.log('WATERFALL DEBUG: First measurement structure:', {
        hasRealImp: !!RealImpedance,
        hasImagImp: !!ImaginaryImpedance,
        hasFreqs: !!Frequencies,
        realLength: RealImpedance?.length,
        imagLength: ImaginaryImpedance?.length,
        freqLength: Frequencies?.length,
        keys: Object.keys(measurement),
        fullMeasurement: measurement
      });
    }
    
    console.log(`Waterfall Spectrum ${spectrumIndex}:`, {
      hasRealImp: !!RealImpedance,
      hasImagImp: !!ImaginaryImpedance,
      hasFreqs: !!Frequencies,
      realLength: RealImpedance?.length,
      imagLength: ImaginaryImpedance?.length,
      freqLength: Frequencies?.length,
      sampleReal: RealImpedance?.slice(0, 3),
      sampleImag: ImaginaryImpedance?.slice(0, 3)
    });
    
    if (RealImpedance && ImaginaryImpedance && Frequencies &&
        RealImpedance.length > 0 && ImaginaryImpedance.length > 0 &&
        RealImpedance.length === ImaginaryImpedance.length) {
      
      const x = [];
      const y = [];
      const z = [];
      
      for (let freqIndex = 0; freqIndex < RealImpedance.length; freqIndex++) {
        const realVal = RealImpedance[freqIndex];
        const imagVal = ImaginaryImpedance[freqIndex];
        const freq = Frequencies[freqIndex];
        
        if (typeof realVal === 'number' && typeof imagVal === 'number' && 
            typeof freq === 'number' && !isNaN(realVal) && !isNaN(imagVal) && !isNaN(freq)) {
          // Calculate impedance magnitude |Z| = sqrt(real^2 + imag^2)
          const magnitude = Math.sqrt(realVal * realVal + imagVal * imagVal);
          
          x.push(Math.log10(freq)); // Log frequency for X-axis
          y.push(spectrumIndex + 1); // Spectrum number for Y-axis
          z.push(magnitude); // Impedance magnitude for Z-axis
        }
      }
      
      // Add this spectrum as a separate trace
      if (x.length > 0) {
        data.push({
          x: x,
          y: y,
          z: z,
          mode: 'markers',
          type: 'scatter3d',
          marker: {
            size: 2,
            color: '#000000'
          },
          name: `Spectrum ${spectrumIndex + 1}`,
          showlegend: true,
          visible: visible
        });
      }
    }
  });
  
  console.log('Waterfall plot data traces:', {
    tracesCount: data.length,
    spectraCount: allWebhookData.length,
    showAllSpectrums,
    selectedSpectrum
  });
  
  // If no data points, show debug info
  if (data.length === 0) {
    console.error('WATERFALL ERROR: No data points generated!', {
      spectraCount: allWebhookData.length,
      firstSpectrum: allWebhookData[0],
      hasFrequencies: allWebhookData[0]?.Frequencies?.length > 0
    });
  }

  // Prepare info text for annotation
  let freqRangeText = 'N/A';
  let zRangeText = 'N/A';
  
  if (data.length > 0) {
    const allX = data.flatMap(trace => trace.x);
    const allZ = data.flatMap(trace => trace.z);
    
    if (allX.length > 0 && allZ.length > 0) {
      freqRangeText = `10^${Math.min(...allX).toFixed(1)} - 10^${Math.max(...allX).toFixed(1)} Hz`;
      zRangeText = `${Math.min(...allZ).toFixed(1)} - ${Math.max(...allZ).toFixed(1)} Ω`;
    }
  }

  const layout = {
    title: '3D Waterfall Plot (EIS) - Frequency Response Evolution',
    scene: {
      xaxis: {
        title: {
          text: "log₁₀(f) [Hz]",
          font: { size: 16, color: '#000000', family: 'Arial Black' }
        },
        tickfont: { size: 12, color: '#333333' },
        showgrid: true,
        gridcolor: '#e0e0e0',
        range: axisRanges.xRange
      },
      yaxis: {
        title: {
          text: "n",
          font: { size: 16, color: '#000000', family: 'Arial Black' }
        },
        tickfont: { size: 12, color: '#333333' },
        showgrid: true,
        gridcolor: '#e0e0e0'
      },
      zaxis: {
        title: {
          text: "|Z| [Ω]",
          font: { size: 16, color: '#000000', family: 'Arial Black' }
        },
        tickfont: { size: 12, color: '#333333' },
        showgrid: true,
        gridcolor: '#e0e0e0',
        range: axisRanges.zRange
      },
      camera: {
        eye: { x: 1.5, y: -1.2, z: 1.5 }
      }
    },
    annotations: [
      {
        text: `${allWebhookData.length} spectra • ${data.length > 0 ? data.reduce((sum, trace) => sum + trace.x.length, 0) : 0} points • |Z|: ${zRangeText}`,
        showarrow: false,
        xref: "paper",
        yref: "paper",
        x: 0.02,
        y: 0.98,
        xanchor: 'left',
        yanchor: 'top',
        font: { size: 12, color: '#495057' },
        bgcolor: 'rgba(255,255,255,0.8)',
        bordercolor: '#dee2e6',
        borderwidth: 1
      }
    ],
    margin: { l: 0, r: 0, b: 0, t: 50 },
    height: 630
  };

  const config = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d']
  };

  // Handle legend click events
  const handleLegendClick = (event) => {
    console.log('Waterfall legend click event:', event);
    const curveNumber = event.curveNumber;
    if (curveNumber !== undefined && curveNumber >= 0) {
      console.log(`Waterfall: Showing only spectrum ${curveNumber + 1}`);
      showOnlySpectrum(curveNumber);
      return false; // Prevent default Plotly legend behavior
    }
    return false;
  };

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Spectrum Control Buttons */}
      <div style={{ 
        marginBottom: '15px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6',
        borderRadius: '5px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Waterfall Spectrum Controls</h4>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={showAll}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Show All Spectra
          </button>
          <button 
            onClick={hideAll}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Clear Plot
          </button>
        </div>
        <p style={{ 
          margin: '10px 0 0 0', 
          fontSize: '12px', 
          color: '#6c757d',
          fontStyle: 'italic' 
        }}>
          💡 Click on spectrum names in the legend to show individual spectra (when frequencies available)
        </p>
      </div>
      
      {/* Waterfall Plot Legend */}
      <div style={{ 
        marginBottom: '15px', 
        fontSize: '14px', 
        backgroundColor: '#e8f5fd', 
        padding: '15px',
        border: '1px solid #bee5eb',
        borderRadius: '5px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#0c5460', fontWeight: 'bold' }}>📊 Waterfall Plot Legend</h4>
        
        {showAllSpectrums ? (
          // Show summary for all spectra
          <div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Display Mode:</strong> <span style={{ color: '#28a745' }}>All {allWebhookData.length} spectra</span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Data Points per Spectrum:</strong> {allWebhookData[0]?.RealImpedance?.length || 'N/A'}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Frequency Range:</strong> {freqRangeText}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>|Z| Range:</strong> {data.length > 0 ? 
                (() => {
                  const allZ = data.flatMap(trace => trace.z);
                  return allZ.length > 0 ? `${Math.min(...allZ).toFixed(3)} - ${Math.max(...allZ).toFixed(3)} Ω` : 'N/A';
                })() : 'N/A'}
            </div>
            <div>
              <strong>Chi-Square:</strong> <span style={{ color: '#6c757d', fontFamily: 'monospace' }}>
                {allWebhookData[0]?.ChiSquare !== null && allWebhookData[0]?.ChiSquare !== undefined 
                  ? allWebhookData[0].ChiSquare.toExponential(3) 
                  : 'N/A'}
              </span>
            </div>
          </div>
        ) : selectedSpectrum !== null ? (
          // Show detailed info for selected spectrum
          (() => {
            const spectrum = allWebhookData[selectedSpectrum];
            return (
              <div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Selected:</strong> <span style={{ color: '#007bff', fontWeight: 'bold' }}>Spectrum {selectedSpectrum + 1}</span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>ID:</strong> {spectrum?.ID || 'N/A'}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Chi-Square (χ²):</strong> <span style={{ fontFamily: 'monospace', backgroundColor: '#fff', padding: '2px 4px', borderRadius: '3px', color: '#6c757d' }}>
                    {spectrum?.ChiSquare !== null && spectrum?.ChiSquare !== undefined 
                      ? spectrum.ChiSquare.toExponential(3) 
                      : 'N/A'}
                  </span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Data Points:</strong> {spectrum?.RealImpedance?.length || 'N/A'}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Frequency Range:</strong> <span style={{ fontFamily: 'monospace' }}>
                    {spectrum?.Frequencies ? 
                      `${Math.min(...spectrum.Frequencies).toExponential(2)} - ${Math.max(...spectrum.Frequencies).toExponential(2)} Hz` : 'N/A'}
                  </span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>|Z| Range:</strong> <span style={{ fontFamily: 'monospace' }}>
                    {spectrum?.RealImpedance && spectrum?.ImaginaryImpedance ? (() => {
                      const magnitudes = spectrum.RealImpedance.map((real, i) => 
                        Math.sqrt(real * real + spectrum.ImaginaryImpedance[i] * spectrum.ImaginaryImpedance[i])
                      );
                      return `${Math.min(...magnitudes).toFixed(3)} - ${Math.max(...magnitudes).toFixed(3)} Ω`;
                    })() : 'N/A'}
                  </span>
                </div>
              </div>
            );
          })()
        ) : (
          // Empty plot state
          <div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Display Mode:</strong> <span style={{ color: '#6c757d' }}>0 of {allWebhookData.length} spectra</span>
            </div>
            <div style={{ fontStyle: 'italic', color: '#6c757d' }}>
              Click spectrum name in legend to view details
            </div>
          </div>
        )}
      </div>
      <Plot
        key={`waterfall-plot-${selectedSpectrum}-${showAllSpectrums}`}
        data={data}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '630px' }}
        onLegendClick={handleLegendClick}
      />
    </div>
  );
};

export default WaterfallPlot3D;