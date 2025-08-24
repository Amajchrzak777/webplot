import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';

const ParameterEvolutionPlot2D = ({ allSpectra }) => {
  // Function to extract circuit parameters dynamically from goimpcore results
  const extractCircuitParameters = (parameters, elementNames) => {
    if (!parameters || !elementNames || parameters.length !== elementNames.length) {
      return null;
    }

    console.log('🔧 Extracting parameters:', {
      elementNames,
      parameters,
      mapping: elementNames.map((name, idx) => `${name}=${parameters[idx].toExponential(2)}`)
    });

    // Create dynamic parameter mapping with proper numbering
    const parameterMap = {};
    const circuitElements = [];
    
    // Count occurrences of each element type to give them unique names
    const elementCounts = {};
    
    for (let i = 0; i < elementNames.length; i++) {
      const elementName = elementNames[i].toLowerCase();
      const value = parameters[i];
      
      // Create a more readable parameter name with proper numbering
      let displayName = elementName.toUpperCase();
      let includeInPlots = true;
      
      if (elementName === 'qy') {
        // CPE Y parameter - this will be the main Q plot
        displayName = 'Q';
      } else if (elementName === 'qn') {
        // CPE n parameter - store for table but don't create separate plot
        displayName = 'n';
        includeInPlots = false; // Don't create a separate plot for n
      } else if (elementName === 'r') {
        // Number resistances: R1, R2, R3, etc.
        elementCounts['r'] = (elementCounts['r'] || 0) + 1;
        displayName = `R${elementCounts['r']}`;
      } else if (elementName === 'c') {
        // Number capacitances: C1, C2, C3, etc.
        elementCounts['c'] = (elementCounts['c'] || 0) + 1;
        displayName = `C${elementCounts['c']}`;
      } else if (elementName === 'l') {
        // Number inductances: L1, L2, L3, etc.
        elementCounts['l'] = (elementCounts['l'] || 0) + 1;
        displayName = `L${elementCounts['l']}`;
      } else if (elementName === 'w') {
        // Number Warburg elements: W1, W2, W3, etc.
        elementCounts['w'] = (elementCounts['w'] || 0) + 1;
        displayName = `W${elementCounts['w']}`;
      }
      
      // Always store in parameter map for table display
      parameterMap[displayName] = value;
      
      // Only add to circuitElements if it should have its own plot
      if (includeInPlots) {
        circuitElements.push({
          name: displayName,
          originalName: elementName,
          value: value,
          index: i
        });
      }
    }

    const result = {
      parameters: parameterMap,
      circuitElements: circuitElements,
      originalElementNames: elementNames,
      originalParameters: parameters
    };

    console.log('✅ Extracted circuit parameters:', result);
    
    return result;
  };


  // Extract parameters for all spectra using goimpcore results
  const parameterEvolution = useMemo(() => {
    if (!allSpectra || allSpectra.length === 0) {
      return null;
    }

    console.log('🔍 DEBUG: Analyzing webhook data from goimpcore:');
    console.log('Total spectra:', allSpectra.length);
    
    const results = [];
    const allParameterNames = new Set();
    
    for (let i = 0; i < allSpectra.length; i++) {
      const spectrum = allSpectra[i];
      
      console.log(`\n📊 Spectrum ${i + 1}:`, {
        ID: spectrum.ID,
        Parameters: spectrum.Parameters,
        ElementNames: spectrum.ElementNames,
        ChiSquare: spectrum.ChiSquare,
        CircuitType: spectrum.CircuitType
      });
      
      // Use real parameters calculated by goimpcore
      if (spectrum.Parameters && spectrum.ElementNames) {
        const params = extractCircuitParameters(spectrum.Parameters, spectrum.ElementNames);
        if (params) {
          // Use circuit type from webhook
          const circuitType = spectrum.CircuitType || 'Unknown';
          
          results.push({
            spectrumNumber: i + 1,
            spectrumID: spectrum.ID,
            circuitType: circuitType,
            parameters: params.parameters,
            circuitElements: params.circuitElements,
            chiSquare: spectrum.ChiSquare,
            originalElementNames: params.originalElementNames,
            originalParameters: params.originalParameters
          });
          
          // Collect parameter names that should have plots (excludes 'n')
          params.circuitElements.forEach(element => {
            allParameterNames.add(element.name);
          });
        }
      }
    }

    // Collect ALL parameter names for table (including 'n')
    const allTableParameters = new Set();
    results.forEach(spectrum => {
      Object.keys(spectrum.parameters).forEach(paramName => {
        allTableParameters.add(paramName);
      });
    });

    console.log('✅ Plot parameters found:', Array.from(allParameterNames));
    console.log('✅ All table parameters found:', Array.from(allTableParameters));
    console.log(`✅ Processed ${results.length} spectra with parameters`);

    return {
      spectraData: results,
      uniqueParameters: Array.from(allParameterNames), // For plots
      allTableParameters: Array.from(allTableParameters) // For table
    };
  }, [allSpectra]);

  if (!parameterEvolution || !parameterEvolution.spectraData || parameterEvolution.spectraData.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: '5px',
        marginTop: '20px'
      }}>
        <h4 style={{ color: '#6c757d' }}>📈 Circuit Parameter Evolution</h4>
        <p style={{ color: '#6c757d', fontStyle: 'italic' }}>
          No impedance data available for parameter fitting
        </p>
      </div>
    );
  }

  const { spectraData, uniqueParameters, allTableParameters } = parameterEvolution;
  const spectrumNumbers = spectraData.map(p => p.spectrumNumber);
  
  // Get circuit type from first spectrum
  const circuitType = spectraData.length > 0 ? spectraData[0].circuitType : 'Unknown';

  // Function to get parameter values for a specific parameter across all spectra
  const getParameterValues = (paramName) => {
    return spectraData.map(spectrum => {
      return spectrum.parameters[paramName] || 0;
    });
  };

  // Function to get parameter unit and color
  const getParameterInfo = (paramName) => {
    const colors = ['#dc3545', '#fd7e14', '#6f42c1', '#28a745', '#17a2b8', '#ffc107', '#e83e8c'];
    const colorIndex = uniqueParameters.indexOf(paramName) % colors.length;
    
    let unit = '';
    let useLogScale = false;
    
    if (paramName.toUpperCase() === 'R' || paramName.includes('R')) {
      unit = '[Ω]';
    } else if (paramName.toUpperCase() === 'C') {
      unit = '[F]';
      useLogScale = true;
    } else if (paramName.toUpperCase() === 'Q') {
      unit = '[S⋅s^n]';
      useLogScale = true;
    } else if (paramName.toLowerCase() === 'n') {
      unit = '';
    }
    
    return {
      color: colors[colorIndex],
      unit: unit,
      useLogScale: useLogScale
    };
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <h4 style={{ 
        margin: '0 0 15px 0', 
        color: '#495057',
        borderBottom: '2px solid #dee2e6',
        paddingBottom: '8px'
      }}>
        📈 Circuit Parameters: {circuitType}
      </h4>
      
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '20px',
        fontSize: '12px',
        color: '#6c757d'
      }}>
        <strong>Dane źródłowe:</strong> Parametry obliczone przez goimpcore<br/>
        <strong>Typ układu:</strong> {circuitType} | <strong>Wykresy:</strong> {uniqueParameters.join(', ')} | <strong>Tabela:</strong> {allTableParameters.join(', ')}
      </div>

      {/* Dynamic Parameter evolution plots */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px' 
      }}>
        
        {/* Individual parameter plots */}
        {uniqueParameters.map((paramName) => {
          const paramInfo = getParameterInfo(paramName);
          const paramValues = getParameterValues(paramName);
          
          return (
            <div key={paramName} style={{
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
                color: paramInfo.color
              }}>
                {paramName}
              </div>
              
              <div style={{ padding: '15px' }}>
                <Plot
                  data={[{
                    x: spectrumNumbers,
                    y: paramValues,
                    type: 'scatter',
                    mode: 'lines+markers',
                    marker: {
                      size: 6,
                      color: paramInfo.color,
                      line: { width: 1, color: '#ffffff' }
                    },
                    line: {
                      color: paramInfo.color,
                      width: 3
                    },
                    name: paramName
                  }]}
                  layout={{
                    title: {
                      text: `Ewolucja parametru ${paramName}`,
                      font: { size: 14, color: '#495057' }
                    },
                    xaxis: {
                      title: {
                        text: 'Numer Widma',
                        font: { size: 12, color: '#495057' }
                      },
                      showgrid: true,
                      gridcolor: '#f0f0f0',
                      tickfont: { size: 11 }
                    },
                    yaxis: {
                      title: {
                        text: `${paramName} ${paramInfo.unit}`,
                        font: { size: 12, color: '#495057' }
                      },
                      type: paramInfo.useLogScale ? 'log' : 'linear',
                      showgrid: true,
                      gridcolor: '#f0f0f0',
                      tickfont: { size: 11 }
                    },
                    margin: { l: 70, r: 30, t: 50, b: 60 },
                    height: 300,
                    showlegend: false,
                    plot_bgcolor: '#fafafa',
                    paper_bgcolor: '#ffffff'
                  }}
                  config={{
                    displayModeBar: false
                  }}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          );
        })}

        {/* Combined Parameters Plot */}
        <div style={{
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
            color: '#28a745'
          }}>
            All Parameters
          </div>
          
          <div style={{ padding: '15px' }}>
            <Plot
              data={uniqueParameters.map((paramName) => {
                const paramInfo = getParameterInfo(paramName);
                const paramValues = getParameterValues(paramName);
                const maxValue = Math.max(...paramValues);
                
                return {
                  x: spectrumNumbers,
                  y: paramValues.map(v => v / maxValue),
                  type: 'scatter',
                  mode: 'lines+markers',
                  marker: { size: 4, color: paramInfo.color },
                  line: { color: paramInfo.color, width: 2 },
                  name: `${paramName} (norm)`
                };
              })}
              layout={{
                title: {
                  text: 'Znormalizowana Ewolucja Wszystkich Parametrów',
                  font: { size: 14, color: '#495057' }
                },
                xaxis: {
                  title: {
                    text: 'Numer Widma',
                    font: { size: 12, color: '#495057' }
                  },
                  showgrid: true,
                  gridcolor: '#f0f0f0',
                  tickfont: { size: 11 }
                },
                yaxis: {
                  title: {
                    text: 'Wartość Znormalizowana',
                    font: { size: 12, color: '#495057' }
                  },
                  showgrid: true,
                  gridcolor: '#f0f0f0',
                  tickfont: { size: 11 }
                },
                margin: { l: 70, r: 30, t: 50, b: 60 },
                height: 300,
                showlegend: true,
                legend: { x: 0.02, y: 0.98 },
                plot_bgcolor: '#fafafa',
                paper_bgcolor: '#ffffff'
              }}
              config={{
                displayModeBar: false
              }}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Dynamic Parameter Summary Table */}
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
          Parametry z goimpcore - {circuitType}
        </div>
        <div style={{ padding: '15px', maxHeight: '300px', overflowY: 'auto' }}>
          <table style={{ width: '100%', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Widmo</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Układ</th>
                {allTableParameters.map(paramName => (
                  <th key={paramName} style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>
                    {paramName} {getParameterInfo(paramName).unit}
                  </th>
                ))}
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>χ²</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Elementy</th>
              </tr>
            </thead>
            <tbody>
              {spectraData.map((spectrum, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '6px 8px' }}>{spectrum.spectrumNumber}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 'bold', color: '#28a745' }}>
                    {spectrum.circuitType}
                  </td>
                  {allTableParameters.map(paramName => (
                    <td key={paramName} style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                      {spectrum.parameters[paramName] ? 
                        (spectrum.parameters[paramName] > 1e-3 && spectrum.parameters[paramName] < 1e3 ? 
                          spectrum.parameters[paramName].toFixed(4) : 
                          spectrum.parameters[paramName].toExponential(3)
                        ) : '-'}
                    </td>
                  ))}
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {spectrum.chiSquare ? spectrum.chiSquare.toExponential(3) : 'N/A'}
                  </td>
                  <td style={{ padding: '6px 8px', fontSize: '10px', fontFamily: 'monospace' }}>
                    {spectrum.originalElementNames ? spectrum.originalElementNames.join(', ') : 'N/A'}
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

export default ParameterEvolutionPlot2D;