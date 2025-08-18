import React from 'react';
import Plot from 'react-plotly.js';

const ElementImpedancePlots2D = ({ spectrum }) => {
  if (!spectrum || !spectrum.ElementImpedances || !spectrum.Frequencies || 
      spectrum.ElementImpedances.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: '5px',
        marginTop: '20px'
      }}>
        <h4 style={{ color: '#6c757d' }}>📈 Element Impedance vs Frequency</h4>
        <p style={{ color: '#6c757d', fontStyle: 'italic' }}>
          No element impedance data available for this spectrum
        </p>
      </div>
    );
  }

  const { ElementImpedances, Frequencies } = spectrum;

  // Helper function to calculate magnitude from real/imag impedance data
  const calculateMagnitude = (impedances) => {
    return impedances.map(imp => Math.sqrt(imp.real * imp.real + imp.imag * imp.imag));
  };

  // Helper function to calculate phase from real/imag impedance data  
  const calculatePhase = (impedances) => {
    return impedances.map(imp => Math.atan2(imp.imag, imp.real) * 180 / Math.PI);
  };

  // Get element color based on type
  const getElementColor = (elementName) => {
    const colors = {
      'r': '#dc3545', // Red for resistance
      'c': '#007bff', // Blue for capacitance
      'l': '#28a745', // Green for inductance  
      'w': '#ffc107', // Yellow for Warburg
      'q': '#6f42c1', // Purple for CPE
      'Q': '#6f42c1', // Purple for CPE (uppercase)
      'o': '#fd7e14', // Orange for open
      't': '#20c997', // Teal for transmission
      'g': '#6c757d'  // Gray for conductance
    };
    return colors[elementName.charAt(0).toLowerCase()] || '#495057';
  };

  // Get element display name
  const getElementDisplayName = (elementName) => {
    const names = {
      'r': 'Resistance',
      'c': 'Capacitance', 
      'l': 'Inductance',
      'w': 'Warburg',
      'q': 'CPE',
      'Q': 'CPE (Constant Phase Element)',
      'o': 'Open Circuit',
      't': 'Transmission Line',
      'g': 'Conductance'
    };
    return names[elementName.charAt(0).toLowerCase()] || names[elementName] || elementName.toUpperCase();
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <h4 style={{ 
        margin: '0 0 15px 0', 
        color: '#495057',
        borderBottom: '2px solid #dee2e6',
        paddingBottom: '8px'
      }}>
        📈 Element Impedance vs Frequency - Spectrum {spectrum.ID}
      </h4>
      
      {/* Simple magnitude plots - one per element */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px' 
      }}>
        {ElementImpedances.map((element, index) => {
          const magnitude = calculateMagnitude(element.impedances);
          const elementColor = getElementColor(element.name);
          const displayName = getElementDisplayName(element.name);
          
          return (
            <div key={index} style={{
              backgroundColor: '#ffffff',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '12px 15px',
                borderBottom: '1px solid #dee2e6',
                fontWeight: 'bold',
                color: elementColor
              }}>
                {displayName} ({element.name})
              </div>
              
              <div style={{ padding: '15px' }}>
                <Plot
                  data={[{
                    x: Frequencies,
                    y: magnitude,
                    type: 'scatter',
                    mode: 'lines+markers',
                    marker: {
                      size: 4,
                      color: elementColor,
                      line: { width: 1, color: '#ffffff' }
                    },
                    line: {
                      color: elementColor,
                      width: 3
                    },
                    name: `|Z_${element.name}|`
                  }]}
                  layout={{
                    title: {
                      text: `|Z_${element.name}| vs Frequency`,
                      font: { size: 14, color: '#495057' }
                    },
                    xaxis: {
                      title: 'Frequency [Hz]',
                      type: 'log',
                      showgrid: true,
                      gridcolor: '#f0f0f0',
                      tickfont: { size: 11 },
                      exponentformat: 'SI'
                    },
                    yaxis: {
                      title: 'Impedance Magnitude [Ω]',
                      type: 'log',
                      showgrid: true,
                      gridcolor: '#f0f0f0',
                      tickfont: { size: 11 },
                      exponentformat: 'power'
                    },
                    margin: { l: 70, r: 30, t: 50, b: 60 },
                    height: 350,
                    showlegend: false,
                    plot_bgcolor: '#fafafa',
                    paper_bgcolor: '#ffffff'
                  }}
                  config={{
                    displayModeBar: false
                  }}
                  style={{ width: '100%' }}
                />
                
                <div style={{ 
                  marginTop: '10px', 
                  fontSize: '12px', 
                  color: '#6c757d',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>Data points: {magnitude.length}</span>
                  <span>
                    Range: {magnitude.length > 0 ? 
                      `${magnitude[0].toExponential(1)} - ${magnitude[magnitude.length-1].toExponential(1)} Ω` 
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ElementImpedancePlots2D;