import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';

const ParameterEvolutionPlot2D = ({ allSpectra }) => {
  // Function to extract circuit parameters from goimpcore results
  const extractCircuitParameters = (parameters, elementNames) => {
    if (!parameters || !elementNames || parameters.length !== elementNames.length) {
      return null;
    }

    console.log('🔧 Extracting parameters:', {
      elementNames,
      parameters,
      mapping: elementNames.map((name, idx) => `${name}=${parameters[idx].toExponential(2)}`)
    });

    let R1 = null, R2 = null, C = null, Q = null, n = null;
    let circuitType = 'unknown';
    
    // Find parameters by element names (from goimpcore)
    const resistances = [];
    const capacitances = [];
    
    for (let i = 0; i < elementNames.length; i++) {
      const elementName = elementNames[i].toLowerCase();
      const value = parameters[i];
      
      if (elementName === 'r') {
        resistances.push(value);
      } else if (elementName === 'c') {
        capacitances.push(value);
      } else if (elementName === 'qy') {
        Q = value; // CPE Y parameter (Q)
      } else if (elementName === 'qn') {
        n = value; // CPE n parameter (exponent)
      }
    }

    // Determine circuit type and assign parameters
    if (resistances.length >= 1 && capacitances.length >= 1) {
      // R(CR) circuit - most common
      circuitType = 'R(CR)';
      R1 = resistances[0]; // Series resistance
      R2 = resistances.length > 1 ? resistances[1] : 0; // Parallel resistance
      C = capacitances[0]; // Capacitance
      
      // Convert R(CR) to approximate R(QR) parameters for comparison
      if (C > 0) {
        Q = C; // Rough approximation: Q ≈ C for comparison
        n = 1.0; // Pure capacitor has n = 1
      }
    } else if (resistances.length >= 2 && Q !== null && n !== null) {
      // R(QR) circuit
      circuitType = 'R(QR)';
      R1 = resistances[0]; // Series resistance
      R2 = resistances[1]; // Charge transfer resistance
    } else {
      // Fallback for other circuits
      circuitType = `Custom (${elementNames.join('')})`;
      R1 = resistances[0] || 0;
      R2 = resistances[1] || resistances[0] || 0;
      Q = Q || C || 1e-5;
      n = n || (C ? 1.0 : 0.8);
    }

    const result = {
      R1: R1 || 0,
      R2: R2 || 0,
      C: C || 0,
      Q: Q || 1e-5,
      n: n || 0.8,
      circuitType,
      originalElementNames: elementNames,
      originalParameters: parameters
    };

    console.log('✅ Extracted circuit parameters:', result);
    
    // Detailed analysis for DEIS validation
    console.table({
      'Parameter': ['R1 (Series)', 'R2 (Charge Transfer)', 'C (Capacitance)', 'Q (CPE)', 'n (CPE Exp)', 'Circuit Type'],
      'Value': [
        `${result.R1.toExponential(3)} Ω`,
        `${result.R2.toExponential(3)} Ω`, 
        result.C > 0 ? `${result.C.toExponential(3)} F` : 'N/A',
        `${result.Q.toExponential(3)} S⋅s^n`,
        result.n.toFixed(3),
        result.circuitType
      ],
      'DEIS Assessment': [
        result.R1 < 0.1 || result.R1 > 1000 ? '⚠️ SUSPICIOUS' : '✅ OK',
        result.R2 < 0.01 || result.R2 > 1e7 ? '⚠️ SUSPICIOUS' : '✅ OK',
        result.C > 0 && (result.C < 1e-9 || result.C > 0.1) ? '⚠️ SUSPICIOUS' : result.C > 0 ? '✅ OK' : 'N/A',
        result.Q < 1e-9 || result.Q > 0.1 ? '⚠️ SUSPICIOUS' : '✅ OK',
        result.n < 0.5 || result.n > 1.0 ? '⚠️ SUSPICIOUS' : '✅ OK',
        result.circuitType.includes('Custom') ? '⚠️ NON-STANDARD' : '✅ OK'
      ]
    });
    
    return result;
  };


  // Extract parameters for all spectra using goimpcore results
  const parameterEvolution = useMemo(() => {
    if (!allSpectra || allSpectra.length === 0) {
      return null;
    }

    console.log('🔍 DEBUG: Analyzing webhook data from goimpcore:');
    console.log('Total spectra:', allSpectra.length);
    
    // Summary for DEIS analysis
    const summary = {
      totalSpectra: allSpectra.length,
      spectraWithParameters: 0,
      circuitTypes: new Set(),
      parameterRanges: {
        R1: { min: Infinity, max: -Infinity },
        R2: { min: Infinity, max: -Infinity },
        C: { min: Infinity, max: -Infinity },
        Q: { min: Infinity, max: -Infinity },
        n: { min: Infinity, max: -Infinity }
      }
    };
    
    const results = [];
    
    for (let i = 0; i < allSpectra.length; i++) {
      const spectrum = allSpectra[i];
      
      console.log(`\n📊 Spectrum ${i + 1}:`, {
        ID: spectrum.ID,
        Parameters: spectrum.Parameters,
        ElementNames: spectrum.ElementNames,
        ChiSquare: spectrum.ChiSquare,
        HasFrequencies: !!spectrum.Frequencies,
        HasRealImpedance: !!spectrum.RealImpedance,
        HasElementImpedances: !!spectrum.ElementImpedances,
        ParameterMapping: spectrum.Parameters && spectrum.ElementNames ? 
          spectrum.ElementNames.map((name, idx) => `${name}=${spectrum.Parameters[idx]}`) : []
      });
      
      // Use real parameters calculated by goimpcore
      if (spectrum.Parameters && spectrum.ElementNames) {
        const params = extractCircuitParameters(spectrum.Parameters, spectrum.ElementNames);
        if (params) {
          results.push({
            spectrumNumber: i + 1,
            spectrumID: spectrum.ID,
            ...params,
            chiSquare: spectrum.ChiSquare
          });
          
          // Update summary statistics
          summary.spectraWithParameters++;
          summary.circuitTypes.add(params.circuitType);
          
          // Track parameter ranges for DEIS analysis
          const ranges = summary.parameterRanges;
          ranges.R1.min = Math.min(ranges.R1.min, params.R1);
          ranges.R1.max = Math.max(ranges.R1.max, params.R1);
          ranges.R2.min = Math.min(ranges.R2.min, params.R2);
          ranges.R2.max = Math.max(ranges.R2.max, params.R2);
          if (params.C > 0) {
            ranges.C.min = Math.min(ranges.C.min, params.C);
            ranges.C.max = Math.max(ranges.C.max, params.C);
          }
          ranges.Q.min = Math.min(ranges.Q.min, params.Q);
          ranges.Q.max = Math.max(ranges.Q.max, params.Q);
          ranges.n.min = Math.min(ranges.n.min, params.n);
          ranges.n.max = Math.max(ranges.n.max, params.n);
        }
      }
    }

    // Print comprehensive DEIS analysis summary
    if (results.length > 0) {
      console.log('\n📊 DEIS PARAMETER ANALYSIS SUMMARY:');
      console.table({
        'Metric': ['Total Spectra', 'With Parameters', 'Circuit Types', 'R1 Range (Ω)', 'R2 Range (Ω)', 'C Range (F)', 'Q Range (S⋅s^n)', 'n Range'],
        'Value': [
          summary.totalSpectra,
          summary.spectraWithParameters,
          Array.from(summary.circuitTypes).join(', '),
          `${summary.parameterRanges.R1.min.toExponential(2)} - ${summary.parameterRanges.R1.max.toExponential(2)}`,
          `${summary.parameterRanges.R2.min.toExponential(2)} - ${summary.parameterRanges.R2.max.toExponential(2)}`,
          summary.parameterRanges.C.min < Infinity ? `${summary.parameterRanges.C.min.toExponential(2)} - ${summary.parameterRanges.C.max.toExponential(2)}` : 'N/A',
          `${summary.parameterRanges.Q.min.toExponential(2)} - ${summary.parameterRanges.Q.max.toExponential(2)}`,
          `${summary.parameterRanges.n.min.toFixed(3)} - ${summary.parameterRanges.n.max.toFixed(3)}`
        ],
        'DEIS Assessment': [
          '✅ INFO',
          summary.spectraWithParameters === summary.totalSpectra ? '✅ ALL GOOD' : '⚠️ MISSING DATA',
          Array.from(summary.circuitTypes).every(type => ['R(CR)', 'R(QR)'].includes(type)) ? '✅ STANDARD' : '⚠️ NON-STANDARD',
          summary.parameterRanges.R1.max/summary.parameterRanges.R1.min > 100 ? '⚠️ HIGH VARIATION' : '✅ STABLE',
          summary.parameterRanges.R2.max/summary.parameterRanges.R2.min > 1000 ? '✅ EXPECTED VARIATION' : '⚠️ LOW VARIATION',
          'ℹ️ CHECK INDIVIDUAL',
          summary.parameterRanges.Q.max/summary.parameterRanges.Q.min > 100 ? '⚠️ HIGH VARIATION' : '✅ STABLE',
          summary.parameterRanges.n.max - summary.parameterRanges.n.min > 0.2 ? '⚠️ HIGH VARIATION' : '✅ STABLE'
        ]
      });
    }

    return results;
  }, [allSpectra]);

  if (!parameterEvolution || parameterEvolution.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: '5px',
        marginTop: '20px'
      }}>
        <h4 style={{ color: '#6c757d' }}>📈 R(QR) Parameter Evolution</h4>
        <p style={{ color: '#6c757d', fontStyle: 'italic' }}>
          No impedance data available for parameter fitting
        </p>
      </div>
    );
  }

  const spectrumNumbers = parameterEvolution.map(p => p.spectrumNumber);
  const R1_values = parameterEvolution.map(p => p.R1);
  const R2_values = parameterEvolution.map(p => p.R2);
  const Q_values = parameterEvolution.map(p => p.Q);
  const n_values = parameterEvolution.map(p => p.n);

  return (
    <div style={{ marginTop: '20px' }}>
      <h4 style={{ 
        margin: '0 0 15px 0', 
        color: '#495057',
        borderBottom: '2px solid #dee2e6',
        paddingBottom: '8px'
      }}>
        📈 R(QR) Circuit Parameter Evolution
      </h4>
      
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '20px',
        fontSize: '12px',
        color: '#6c757d'
      }}>
        <strong>Dane źródłowe:</strong> Parametry obliczone przez goimpcore (nie symulowane)<br/>
        <strong>Model:</strong> Automatyczna detekcja układu (R(CR), R(QR), lub inny) i mapowanie parametrów
      </div>

      {/* Parameter evolution plots */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px' 
      }}>
        
        {/* R1 Evolution */}
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
            color: '#dc3545'
          }}>
            R1
          </div>
          
          <div style={{ padding: '15px' }}>
            <Plot
              data={[{
                x: spectrumNumbers,
                y: R1_values,
                type: 'scatter',
                mode: 'lines+markers',
                marker: {
                  size: 6,
                  color: '#dc3545',
                  line: { width: 1, color: '#ffffff' }
                },
                line: {
                  color: '#dc3545',
                  width: 3
                },
                name: 'R₁'
              }]}
              layout={{
                title: {
                  text: 'Ewolucja Oporu R1',
                  font: { size: 14, color: '#495057' }
                },
                xaxis: {
                  title: {
                    text: 'Numer Widma / Spectrum Number',
                    font: { size: 12, color: '#495057' }
                  },
                  showgrid: true,
                  gridcolor: '#f0f0f0',
                  tickfont: { size: 11 }
                },
                yaxis: {
                  title: {
                    text: 'Opór R₁ [Ω] / Series Resistance',
                    font: { size: 12, color: '#495057' }
                  },
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

        {/* R2 Evolution */}
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
            color: '#fd7e14'
          }}>
            R2
          </div>
          
          <div style={{ padding: '15px' }}>
            <Plot
              data={[{
                x: spectrumNumbers,
                y: R2_values,
                type: 'scatter',
                mode: 'lines+markers',
                marker: {
                  size: 6,
                  color: '#fd7e14',
                  line: { width: 1, color: '#ffffff' }
                },
                line: {
                  color: '#fd7e14',
                  width: 3
                },
                name: 'R₂'
              }]}
              layout={{
                title: {
                  text: 'Ewolucja Oporu R2',
                  font: { size: 14, color: '#495057' }
                },
                xaxis: {
                  title: {
                    text: 'Numer Widma / Spectrum Number',
                    font: { size: 12, color: '#495057' }
                  },
                  showgrid: true,
                  gridcolor: '#f0f0f0',
                  tickfont: { size: 11 }
                },
                yaxis: {
                  title: {
                    text: 'Opór R₂ [Ω] / Charge Transfer Resistance',
                    font: { size: 12, color: '#495057' }
                  },
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

        {/* Q Parameter Evolution */}
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
            color: '#6f42c1'
          }}>
            CPE (Q)
          </div>
          
          <div style={{ padding: '15px' }}>
            <Plot
              data={[{
                x: spectrumNumbers,
                y: Q_values,
                type: 'scatter',
                mode: 'lines+markers',
                marker: {
                  size: 6,
                  color: '#6f42c1',
                  line: { width: 1, color: '#ffffff' }
                },
                line: {
                  color: '#6f42c1',
                  width: 3
                },
                name: 'Q'
              }]}
              layout={{
                title: {
                  text: 'Ewolucja Parametru CPE (Q)',
                  font: { size: 14, color: '#495057' }
                },
                xaxis: {
                  title: {
                    text: 'Numer Widma / Spectrum Number',
                    font: { size: 12, color: '#495057' }
                  },
                  showgrid: true,
                  gridcolor: '#f0f0f0',
                  tickfont: { size: 11 }
                },
                yaxis: {
                  title: {
                    text: 'Parametr CPE Q [S⋅s^n]',
                    font: { size: 12, color: '#495057' }
                  },
                  type: 'log',
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
              data={[
                {
                  x: spectrumNumbers,
                  y: R1_values.map(v => v / Math.max(...R1_values)),
                  type: 'scatter',
                  mode: 'lines+markers',
                  marker: { size: 4, color: '#dc3545' },
                  line: { color: '#dc3545', width: 2 },
                  name: 'R₁ (norm)'
                },
                {
                  x: spectrumNumbers,
                  y: R2_values.map(v => v / Math.max(...R2_values)),
                  type: 'scatter',
                  mode: 'lines+markers',
                  marker: { size: 4, color: '#fd7e14' },
                  line: { color: '#fd7e14', width: 2 },
                  name: 'R₂ (norm)'
                },
                {
                  x: spectrumNumbers,
                  y: Q_values.map(v => v / Math.max(...Q_values)),
                  type: 'scatter',
                  mode: 'lines+markers',
                  marker: { size: 4, color: '#6f42c1' },
                  line: { color: '#6f42c1', width: 2 },
                  name: 'Q (norm)'
                }
              ]}
              layout={{
                title: {
                  text: 'Znormalizowana Ewolucja Wszystkich Parametrów',
                  font: { size: 14, color: '#495057' }
                },
                xaxis: {
                  title: {
                    text: 'Numer Widma / Spectrum Number',
                    font: { size: 12, color: '#495057' }
                  },
                  showgrid: true,
                  gridcolor: '#f0f0f0',
                  tickfont: { size: 11 }
                },
                yaxis: {
                  title: {
                    text: 'Wartość Znormalizowana / Normalized Value',
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

      {/* Parameter Summary Table */}
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
          Parametry z goimpcore (Rzeczywiste Wyniki Dopasowania)
        </div>
        <div style={{ padding: '15px', maxHeight: '300px', overflowY: 'auto' }}>
          <table style={{ width: '100%', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Widmo</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Układ</th>
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>R₁ [Ω]</th>
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>R₂ [Ω]</th>
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>C [F]</th>
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>Q [S⋅s^n]</th>
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>n</th>
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>χ²</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Elementy</th>
              </tr>
            </thead>
            <tbody>
              {parameterEvolution.map((params, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '6px 8px' }}>{params.spectrumNumber}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 'bold', color: params.circuitType === 'R(QR)' ? '#28a745' : '#dc3545' }}>
                    {params.circuitType}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {params.R1.toExponential(3)}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {params.R2.toExponential(3)}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {params.C > 0 ? params.C.toExponential(3) : '-'}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {params.Q.toExponential(3)}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {params.n.toFixed(3)}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {params.chiSquare ? params.chiSquare.toExponential(3) : 'N/A'}
                  </td>
                  <td style={{ padding: '6px 8px', fontSize: '10px', fontFamily: 'monospace' }}>
                    {params.originalElementNames ? params.originalElementNames.join(', ') : 'N/A'}
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