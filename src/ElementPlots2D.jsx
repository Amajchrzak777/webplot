import React from 'react';
import Plot from 'react-plotly.js';

const ElementPlots2D = ({ spectrum }) => {
  if (!spectrum || !spectrum.Parameters || !spectrum.ElementNames || 
      spectrum.Parameters.length !== spectrum.ElementNames.length) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: '5px',
        marginTop: '20px'
      }}>
        <h4 style={{ color: '#6c757d' }}>📊 Circuit Element Parameters</h4>
        <p style={{ color: '#6c757d', fontStyle: 'italic' }}>
          No parameter data available for this spectrum
        </p>
      </div>
    );
  }

  const { Parameters, ElementNames } = spectrum;

  // Group parameters by element type
  const elementGroups = {};
  Parameters.forEach((value, index) => {
    const elementName = ElementNames[index];
    const elementType = elementName.charAt(0).toLowerCase();
    
    if (!elementGroups[elementType]) {
      elementGroups[elementType] = {
        name: getElementDisplayName(elementType),
        unit: getElementUnit(elementType),
        values: [],
        indices: []
      };
    }
    
    elementGroups[elementType].values.push(value);
    elementGroups[elementType].indices.push(index + 1);
  });

  return (
    <div style={{ marginTop: '20px' }}>
      <h4 style={{ 
        margin: '0 0 15px 0', 
        color: '#495057',
        borderBottom: '2px solid #dee2e6',
        paddingBottom: '8px'
      }}>
        📊 Circuit Element Parameters - Spectrum {spectrum.ID}
      </h4>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px' 
      }}>
        {Object.entries(elementGroups).map(([elementType, group]) => (
          <div key={elementType} style={{
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
              color: '#495057'
            }}>
              {group.name} ({group.unit})
            </div>
            
            <div style={{ padding: '15px' }}>
              <Plot
                data={[{
                  x: group.indices,
                  y: group.values,
                  type: 'scatter',
                  mode: 'markers+lines',
                  marker: {
                    size: 8,
                    color: getElementColor(elementType),
                    line: { width: 2, color: '#ffffff' }
                  },
                  line: {
                    color: getElementColor(elementType),
                    width: 2
                  },
                  name: group.name
                }]}
                layout={{
                  title: {
                    text: `${group.name} Values`,
                    font: { size: 14, color: '#495057' }
                  },
                  xaxis: {
                    title: 'Element Index',
                    showgrid: true,
                    gridcolor: '#f0f0f0',
                    tickfont: { size: 11 }
                  },
                  yaxis: {
                    title: `${group.name} (${group.unit})`,
                    showgrid: true,
                    gridcolor: '#f0f0f0',
                    tickfont: { size: 11 }
                  },
                  margin: { l: 60, r: 30, t: 40, b: 50 },
                  height: 280,
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
                <span>Count: {group.values.length}</span>
                <span>
                  Range: {group.values.length > 0 ? 
                    `${Math.min(...group.values).toExponential(2)} - ${Math.max(...group.values).toExponential(2)}` 
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary table */}
      <div style={{
        marginTop: '20px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '5px',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: '#e9ecef',
          padding: '10px 15px',
          fontWeight: 'bold',
          color: '#495057'
        }}>
          Parameter Summary
        </div>
        <div style={{ padding: '15px' }}>
          <table style={{ width: '100%', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Index</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Element</th>
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>Value</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Unit</th>
              </tr>
            </thead>
            <tbody>
              {Parameters.map((value, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '6px 8px' }}>{index + 1}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{ElementNames[index]}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {value.toExponential(3)}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {getElementUnit(ElementNames[index].charAt(0).toLowerCase())}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Helper functions
function getElementDisplayName(elementType) {
  const names = {
    'r': 'Resistance',
    'c': 'Capacitance', 
    'l': 'Inductance',
    'w': 'Warburg',
    'q': 'CPE', // Constant Phase Element
    'o': 'Open Circuit',
    't': 'Transmission Line',
    'g': 'Conductance'
  };
  return names[elementType] || elementType.toUpperCase();
}

function getElementUnit(elementType) {
  const units = {
    'r': 'Ω',
    'c': 'F',
    'l': 'H', 
    'w': 'Ω⋅s^-0.5',
    'q': 'S⋅s^n',
    'o': 'Ω',
    't': 'Ω',
    'g': 'S'
  };
  return units[elementType] || '';
}

function getElementColor(elementType) {
  const colors = {
    'r': '#dc3545', // Red for resistance
    'c': '#007bff', // Blue for capacitance
    'l': '#28a745', // Green for inductance
    'w': '#ffc107', // Yellow for Warburg
    'q': '#6f42c1', // Purple for CPE
    'o': '#fd7e14', // Orange for open
    't': '#20c997', // Teal for transmission
    'g': '#6c757d'  // Gray for conductance
  };
  return colors[elementType] || '#495057';
}

export default ElementPlots2D;