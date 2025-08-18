import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import Plotly from 'plotly.js-dist-min';

const ImpedancePlot3D = ({ allWebhookData }) => {
  console.log('ImpedancePlot3D received data:', allWebhookData);
  
  // State to track which spectrum is currently selected (only one visible at a time)
  const [selectedSpectrum, setSelectedSpectrum] = useState(null);
  const [showAllSpectrums, setShowAllSpectrums] = useState(true);
  
  // Debug logging for state changes
  useEffect(() => {
    console.log('State changed - selectedSpectrum:', selectedSpectrum, 'showAllSpectrums:', showAllSpectrums);
  }, [selectedSpectrum, showAllSpectrums]);
  
  // Keep track of data length to only reset when the number of spectra changes
  const [dataLength, setDataLength] = useState(0);
  
  // Initialize with all spectrums shown by default when number of spectra changes
  useEffect(() => {
    if (allWebhookData && allWebhookData.length > 0 && allWebhookData.length !== dataLength) {
      console.log('Number of spectra changed from', dataLength, 'to', allWebhookData.length, '- showing all spectra by default');
      setDataLength(allWebhookData.length);
      setSelectedSpectrum(null);
      setShowAllSpectrums(true);
    }
  }, [allWebhookData, dataLength]); // Only reset when the actual count changes
  
  // Show only specific spectrum
  const showOnlySpectrum = (index) => {
    console.log(`showOnlySpectrum called with index: ${index}`);
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

  // Calculate axis ranges with 5% padding based on visible spectra
  const calculateAxisRanges = () => {
    let allRealValues = [];
    let allImagValues = [];
    
    if (showAllSpectrums) {
      // Show all spectra - use all data
      allWebhookData.forEach(measurement => {
        if (measurement.RealImpedance) allRealValues.push(...measurement.RealImpedance);
        if (measurement.ImaginaryImpedance) allImagValues.push(...measurement.ImaginaryImpedance);
      });
    } else if (selectedSpectrum !== null) {
      // Show only selected spectrum
      const measurement = allWebhookData[selectedSpectrum];
      if (measurement.RealImpedance) allRealValues.push(...measurement.RealImpedance);
      if (measurement.ImaginaryImpedance) allImagValues.push(...measurement.ImaginaryImpedance);
    } else {
      // Empty plot - use all data for consistent scale
      allWebhookData.forEach(measurement => {
        if (measurement.RealImpedance) allRealValues.push(...measurement.RealImpedance);
        if (measurement.ImaginaryImpedance) allImagValues.push(...measurement.ImaginaryImpedance);
      });
    }
    
    if (allRealValues.length === 0 || allImagValues.length === 0) {
      return { xRange: [0, 1], zRange: [0, 1] };
    }
    
    const realMin = Math.min(...allRealValues);
    const realMax = Math.max(...allRealValues);
    const imagMin = Math.min(...allImagValues);
    const imagMax = Math.max(...allImagValues);
    
    // For Nyquist plot, use the same scale for both Z' and Z'' axes
    const overallMin = Math.min(realMin, imagMin);
    const overallMax = Math.max(realMax, imagMax);
    const overallRange = overallMax - overallMin;
    
    const commonRange = [
      overallMin - overallRange * 0.10, 
      overallMax + overallRange * 0.10
    ];
    
    return {
      xRange: commonRange,
      zRange: commonRange
    };
  };
  
  const axisRanges = calculateAxisRanges();
  console.log('Axis ranges calculated:', axisRanges, 'for state:', { selectedSpectrum, showAllSpectrums });
  console.log('Setting axis ranges - X:', axisRanges.xRange, 'Z:', axisRanges.zRange);

  // Create traces for all measurements with proper visibility logic
  const data = allWebhookData.map((measurement, measurementIndex) => {
    const { RealImpedance, ImaginaryImpedance, Time } = measurement;
    
    // Use spectrum count (measurement index) for Y-axis
    const zValue = measurementIndex + 1;
    const zArray = RealImpedance.map(() => zValue);

    // Determine visibility: show only if it's the selected spectrum OR if showAll is true
    let visible = 'legendonly'; // Default: hidden but in legend
    if (showAllSpectrums) {
      visible = true; // Show all spectrums
    } else if (selectedSpectrum === measurementIndex) {
      visible = true; // Show only selected spectrum
    }

    return {
      x: RealImpedance,
      y: zArray,
      z: ImaginaryImpedance,
      mode: 'markers',
      type: 'scatter3d',
      marker: {
        size: 3,
        color: '#000000',
      },
      name: `Spectrum ${measurementIndex + 1}`,
      showlegend: true,
      visible: visible
    };
  });

  // Prepare info text for annotation
  const displayModeText = showAllSpectrums ? `All ${allWebhookData.length} spectra` : 
                         (selectedSpectrum !== null ? `Spectrum ${selectedSpectrum + 1}` : `0 of ${allWebhookData.length} spectra`);
  const dataPointsText = allWebhookData[0]?.RealImpedance?.length || 'N/A';

  const layout = {
    title: '3D Impedance Plot (EIS) - Nyquist Evolution',
    scene: {
      xaxis: {
        title: {
          text: "Z' [Ω]",
          font: { size: 16, color: '#000000', family: 'Arial Black' }
        },
        tickfont: { size: 12, color: '#333333' },
        showgrid: true,
        gridcolor: '#e0e0e0',
        range: axisRanges.xRange,
        autorange: false
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
          text: "Z'' [Ω]",
          font: { size: 16, color: '#000000', family: 'Arial Black' }
        },
        tickfont: { size: 12, color: '#333333' },
        showgrid: true,
        gridcolor: '#e0e0e0',
        type: 'linear',
        range: axisRanges.zRange,
        autorange: false
      },
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.5 }
      },
      aspectmode: 'manual',
      aspectratio: { x: 1, y: 1, z: 0.5 }
    },
    annotations: [
      {
        text: `${displayModeText} • ${dataPointsText} points/spectrum`,
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
    console.log('Legend click event:', event);
    const curveNumber = event.curveNumber;
    if (curveNumber !== undefined && curveNumber >= 0) {
      console.log(`Showing only spectrum ${curveNumber}`);
      showOnlySpectrum(curveNumber);
      return false; // Prevent default Plotly legend behavior
    }
    return false; // Always prevent default to avoid unwanted behavior
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
        <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Spectrum Controls</h4>
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
          💡 Click on spectrum names in the legend to show individual spectra
        </p>
      </div>
      
      {/* Plot Legend - Show details about current selection */}
      <div style={{ 
        marginBottom: '15px', 
        fontSize: '14px', 
        backgroundColor: '#e8f4fd', 
        padding: '15px',
        border: '1px solid #bee5eb',
        borderRadius: '5px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#0c5460', fontWeight: 'bold' }}>📊 Plot Legend</h4>
        
        {showAllSpectrums ? (
          // Show summary when all spectra are visible
          <div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Display Mode:</strong> <span style={{ color: '#28a745' }}>All Spectra Visible</span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Total Spectra:</strong> {allWebhookData.length}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Data Points per Spectrum:</strong> {allWebhookData[0]?.RealImpedance?.length || 'N/A'}
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
            const realMin = spectrum?.RealImpedance ? Math.min(...spectrum.RealImpedance) : 0;
            const realMax = spectrum?.RealImpedance ? Math.max(...spectrum.RealImpedance) : 0;
            const imagMin = spectrum?.ImaginaryImpedance ? Math.min(...spectrum.ImaginaryImpedance) : 0;
            const imagMax = spectrum?.ImaginaryImpedance ? Math.max(...spectrum.ImaginaryImpedance) : 0;
            
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
                  <strong>Z' Range:</strong> <span style={{ fontFamily: 'monospace' }}>
                    {realMin.toFixed(3)} → {realMax.toFixed(3)} Ω
                  </span>
                </div>
                <div>
                  <strong>Z'' Range:</strong> <span style={{ fontFamily: 'monospace' }}>
                    {imagMin.toFixed(3)} → {imagMax.toFixed(3)} Ω
                  </span>
                </div>
              </div>
            );
          })()
        ) : (
          // Show empty plot message
          <div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Display Mode:</strong> <span style={{ color: '#6c757d' }}>Empty Plot</span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Available Spectra:</strong> {allWebhookData.length}
            </div>
            <div style={{ fontStyle: 'italic', color: '#6c757d' }}>
              Click on a spectrum name in the legend to view detailed information
            </div>
          </div>
        )}
      </div>
      <Plot
        key={`plot-${selectedSpectrum}-${showAllSpectrums}`}
        data={data}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '630px' }}
        onLegendClick={handleLegendClick}
        onHover={(event) => {
          // Don't log hover events as they're too noisy, but track if they affect state
          if (event && event.points) {
            // console.log('Hover event:', event.points.length, 'points');
          }
        }}
        onUnhover={() => {
          // console.log('Unhover event');
        }}
        onRelayout={(event) => {
          console.log('Relayout event (could affect legend):', event);
        }}
      />
    </div>
  );
};

export default ImpedancePlot3D;