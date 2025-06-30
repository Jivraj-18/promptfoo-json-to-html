// script.js

// Add debugging function to help identify mapping issues
function logMappingDetails(question, assertions, mapResult) {
  console.group("Question Mapping Details");
  console.log("Question:", question);
  console.log("Assertions:", assertions);
  
  if (mapResult && mapResult.id) {
    if (mapResult.isSpecialCase) {
      console.log(`%cSpecial Case Mapping: ${mapResult.id} (JSON Schema)`, 'color: #9c27b0; font-weight: bold');
    } else if (mapResult.confidence) {
      const confidencePercent = Math.round(mapResult.confidence * 100);
      const confidenceLevel = 
        mapResult.confidence >= 0.9 ? "HIGH" :
        mapResult.confidence >= 0.5 ? "MEDIUM" : "LOW";
      
      const color = 
        mapResult.confidence >= 0.9 ? '#43a047' :
        mapResult.confidence >= 0.5 ? '#26c6da' : '#ff9800';
        
      console.log(`%cMapping Result: ${mapResult.id} (${confidencePercent}% - ${confidenceLevel})`, 
        `color: ${color}; font-weight: bold`);
    } else {
      console.log("Mapping Result:", mapResult);
    }
  } else {
    console.log("%cNo mapping found", "color: #e53935; font-weight: bold");
  }
  
  console.groupEnd();
}

// Load the question_case_map.json file
async function loadQuestionCaseMap() {
  try {
    const response = await fetch('question_case_map.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn("Error loading question_case_map.json:", error);
    return {};
  }
}

// Find the best match for a question and assertion in question_case_map
// Returns an object with id and confidence level (1.0 = perfect match, 0.0 = no match)
function findBestMatch(question, assertions, questionMap) {
  if (!question || typeof question !== 'string') return null;
  
  // Special case: check if this is an is-json assertion
  if (assertions && assertions.length > 0) {
    // Look for is-json assertions
    for (const assertion of assertions) {
      if (assertion.type === 'is-json') {
        // If we find an is-json assertion, extract questionId from the question or generate one
        const questionMatch = question.match(/question\s*(\d+)/i);
        const questionId = questionMatch ? `question${questionMatch[1]}` : "question1";
        
        // Return a special format for is-json assertions: questionid_test0
        return { id: `${questionId}_test0`, confidence: 0.95, isSpecialCase: true };
      }
    }
  }
  
  // Normalize the question for comparison
  const normalizedQuestion = question.trim().toLowerCase();
  
  // First pass: Try to match both question and assertion
  if (assertions && assertions.length > 0) {
    for (const [id, mapItem] of Object.entries(questionMap)) {
      // Try exact question match
      const questionMatches = (
        mapItem.question === question ||
        (mapItem.question && mapItem.question.trim().toLowerCase() === normalizedQuestion)
      );
      
      if (questionMatches) {
        // Check if assertion matches - exact match first
        const mapAssertion = mapItem.assertion && mapItem.assertion.value ? 
          JSON.stringify(mapItem.assertion.value) : "";
          
        // Check for direct match using the simple values array
        if (assertions.simpleValues && assertions.simpleValues.includes(mapAssertion)) {
          return { id, confidence: 1.0 }; // Found exact assertion match
        }
        
        // Try partial assertion matching with detailed assertion objects
        if (mapItem.assertion && mapItem.assertion.type) {
          const mapAssertionType = mapItem.assertion.type;
          const mapAssertionValue = mapItem.assertion.value;
          
          // Check for assertion type matches
          for (const assertion of assertions) {
            // Match on assertion type first
            if (assertion.type === mapAssertionType) {
              // For exact match
              if (assertion.value === mapAssertion) {
                return { id, confidence: 1.0 }; // Perfect match
              }
              
              // For type-specific matching
              if (mapAssertionType === 'llm-rubric') {
                if (assertion.value.includes(mapAssertionValue) || 
                    mapAssertionValue.includes(assertion.value)) {
                  return { id, confidence: 0.95 }; // Very high confidence rubric match
                }
              } 
              else if (mapAssertionType === 'contains') {
                if (assertion.value.includes(mapAssertionValue) || 
                    mapAssertionValue.includes(assertion.value)) {
                  return { id, confidence: 0.95 }; // Very high confidence contains match
                }
              }
              else if (mapAssertionType === assertion.type) {
                return { id, confidence: 0.9 }; // Type match but not perfect value match
              }
            }
            
            // Try fuzzy matching on raw assertion JSON
            try {
              if (assertion.raw.includes(JSON.stringify(mapAssertion)) || 
                  (mapItem.assertion && JSON.stringify(mapItem.assertion).includes(assertion.raw))) {
                return { id, confidence: 0.85 }; // Good partial match in raw assertion
              }
            } catch (e) {
              // If JSON comparison fails, continue
            }
          }
        }
      }
    }
  }
  
  // Second pass: If no match with both question and assertion, try just question matching
  // First try exact match
  for (const [id, mapItem] of Object.entries(questionMap)) {
    if (mapItem.question === question) {
      return { id, confidence: 0.8 }; // Exact question match but no assertion match
    }
  }
  
  // Try fuzzy match - case insensitive and trimmed
  for (const [id, mapItem] of Object.entries(questionMap)) {
    if (mapItem.question && 
        mapItem.question.trim().toLowerCase() === normalizedQuestion) {
      return { id, confidence: 0.7 }; // Normalized question match
    }
  }
  
  // Try contains match
  for (const [id, mapItem] of Object.entries(questionMap)) {
    if (mapItem.question && 
        normalizedQuestion.includes(mapItem.question.trim().toLowerCase())) {
      return { id, confidence: 0.6 }; // Question contains map question
    }
  }
  
  // Try if question_case_map question is contained in the test question
  for (const [id, mapItem] of Object.entries(questionMap)) {
    if (mapItem.question && 
        mapItem.question.trim().toLowerCase().includes(normalizedQuestion)) {
      return { id, confidence: 0.5 }; // Map question contains the question
    }
  }
  
  return { id: null, confidence: 0.0 };
}

document.getElementById('generate-btn').addEventListener('click', async () => {
  // Load question_case_map.json
  const questionMap = await loadQuestionCaseMap();
  
  const input = document.getElementById('json-input').value;
  let data;
  try {
    data = JSON.parse(input);
  } catch (e) {
    alert('Invalid JSON. Please check your input.');
    return;
  }

  if (!data.results || !data.results.prompts || !data.results.results) {
    alert('Invalid PromptFoo JSON structure. Please check your input.');
    return;
  }

  const prompts = data.results.prompts;
  const results = data.results.results;
  const endpoint = prompts[0].provider;

  let html = `
    <div class="report-header">
      <h2>PromptFoo Evaluation Report</h2>
      <p><strong>Evaluation ID:</strong> ${data.evalId || 'N/A'}</p>
      <p><strong>Timestamp:</strong> ${data.results.timestamp || 'N/A'}</p>
      <p><strong>Endpoint:</strong> ${endpoint}</p>
      <div class="id-legend">
        <p><strong>ID Mapping Legend:</strong></p>
        <span class="test-id-badge id-special">Json</span> JSON schema assertion (automatically mapped)
        <span class="test-id-badge id-mapped">Mapped</span> High confidence (90-100%)
        <span class="test-id-badge id-probable">Probable</span> Medium confidence (50-89%)
        <span class="test-id-badge id-generated">Likely</span> Low confidence (1-49%)
        <span class="test-id-badge id-not-found">Not Found</span> No mapping available (0%)
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Question ID</th>
          <th>Question Text</th>
          <th>Image</th>
          <th>Test Status</th>
          <th>Score</th>
          <th>Response</th>
          <th>Failed Assertions</th>
        </tr>
      </thead>
      <tbody>`;

  results.forEach((item, index) => {
    const vars = item.vars || (item.testCase && item.testCase.vars) || {};
    const rawResponse = item.response && item.response.raw ? item.response.raw : '';
    const formattedResponse = item.response && item.response.output ? JSON.stringify(item.response.output, null, 2) : rawResponse;
    const question = vars.question || `Test Case ${index + 1}`;
    const score = item.score || 0;
    const status = item.success ? 'PASS' : 'FAIL';
    
    // Find question ID using question_case_map.json
    let fullId = 'N/A';
    
    // Extract assertions from the test data
    let assertions = [];
    if (item.gradingResult && item.gradingResult.componentResults && item.gradingResult.componentResults.length > 0) {
      // Get all assertion details for more accurate matching
      assertions = item.gradingResult.componentResults.map(cr => {
        if (cr.assertion) {
          // Store both the stringified value and raw assertion for better matching
          return {
            value: cr.assertion.value ? JSON.stringify(cr.assertion.value) : "",
            type: cr.assertion.type || "",
            raw: JSON.stringify(cr.assertion)
          };
        }
        return null;
      }).filter(a => a); // Remove nulls
      
      // Also create a simpler array of just the stringified values for easier matching
      const simpleAssertions = assertions.map(a => a.value).filter(a => a);
      assertions.simpleValues = simpleAssertions;
      
      // Check if any assertion is of type 'is-json' for special handling
      assertions.hasIsJsonAssertion = assertions.some(a => a.type === 'is-json');
    }
    
    // First try to find a match in the question_case_map using both question and assertions
    if (Object.keys(questionMap).length > 0) {
      const matchResult = findBestMatch(question, assertions, questionMap);
      // Log mapping details to console for debugging
      logMappingDetails(question, assertions, matchResult);
      
      if (matchResult && matchResult.id) {
        fullId = matchResult.id;
        // Store confidence and special case flag for display
        item.mappingConfidence = matchResult.confidence;
        if (matchResult.isSpecialCase) {
          item.isSpecialCase = true;
        }
      } else {
        console.warn(`No mapping found for question: "${question.substring(0, 50)}..."`);
      }
    }
    
    // If no match found in question_case_map, generate an ID
    if (fullId === 'N/A') {
      // Try to get ID from the item directly
      const itemTestId = item.testId || '';
      const itemQuestionId = item.questionId || '';
      
      if (itemQuestionId && itemTestId) {
        fullId = `${itemQuestionId}_${itemTestId}`;
      } else if (item.id && typeof item.id === 'string') {
        fullId = item.id;
      } else {
        // Extract numbers from test case name or generate based on index
        const questionMatch = question.match(/question\s*(\d+)/i);
        const testMatch = question.match(/test\s*(\d+)/i);
        
        const questionNum = questionMatch ? questionMatch[1] : index + 1;
        const testNum = testMatch ? testMatch[1] : 1;
        
        fullId = `question${questionNum}_test${testNum}`;
      }
    }
    
    let imageHtml = '';
    if (vars.image) {
      // Handle base64 image from PromptFoo
      let src = '';
      if (typeof vars.image === 'string') {
        if (vars.image.startsWith('data:image')) {
          src = vars.image;
        } else {
          // Detect image format from metadata if available
          let format = 'webp'; // default
          if (item.metadata && item.metadata._promptfooFileMetadata && item.metadata._promptfooFileMetadata.image) {
            format = item.metadata._promptfooFileMetadata.image.format || 'webp';
          }
          src = `data:image/${format};base64,${vars.image}`;
        }
        imageHtml = `<img class="report-image" src="${src}" alt="Test image"/>`;
      }
    }

    // Create test ID badge with color indicating mapping quality
    let badgeClass = 'test-id-badge';
    
    // Determine badge class based on mapping result
    if (item.isSpecialCase) {
      badgeClass += ' id-special'; // Special case (is-json) mapping
    } else if (item.mappingConfidence !== undefined) {
      if (item.mappingConfidence >= 0.9) {
        badgeClass += ' id-mapped'; // High confidence match
      } else if (item.mappingConfidence >= 0.5) {
        badgeClass += ' id-probable'; // Medium confidence match
      } else {
        badgeClass += ' id-generated'; // Low confidence match
      }
    } else {
      // Legacy fallback
      badgeClass += fullId === 'N/A' ? ' id-not-found' : 
                   (fullId.match(/^question\d+_test\d+$/) ? ' id-mapped' : ' id-generated');
    }
    
    // Add confidence percentage if available
    const confidenceDisplay = item.isSpecialCase ? 
      ' <span class="confidence">(json)</span>' :
      (item.mappingConfidence !== undefined ? 
        ` <span class="confidence">(${Math.round(item.mappingConfidence * 100)}%)</span>` : '');
                 
    const testIdDisplay = `<div class="${badgeClass}">${fullId}${confidenceDisplay}</div>`;
    
    // Process test cases and assertions
    const testInfo = [];
    const failedDetails = [];
    
    if (item.gradingResult && item.gradingResult.componentResults) {
      item.gradingResult.componentResults.forEach(cr => {
        const assertion = cr.assertion;
        const pass = cr.pass;
        const reason = cr.reason || '';
        
        let testDesc = '';
        if (assertion) {
          if (assertion.type === 'is-json') {
            testDesc = 'JSON Schema Validation';
          } else if (assertion.type === 'llm-rubric') {
            testDesc = `LLM Rubric: ${assertion.value}`;
          } else if (assertion.type === 'contains') {
            testDesc = `Contains: ${assertion.value}`;
          } else {
            testDesc = assertion.type || 'Unknown Test';
          }
        }
        
        testInfo.push(`
          <div class="${pass ? 'test-pass' : 'test-fail'}">
            ${pass ? '✅' : '❌'} ${testDesc}
          </div>
        `);
        
        if (!pass) {
          failedDetails.push(`
            <div class="failure-detail">
              <strong>Test:</strong> ${testDesc}<br>
              <strong>Expected:</strong> ${assertion ? JSON.stringify(assertion.value) : 'N/A'}<br>
              <strong>Reason:</strong> ${reason}<br>
              ${assertion && assertion.transform ? `<strong>Transform:</strong> ${assertion.transform}<br>` : ''}
            </div>
          `);
        }
      });
    }

    html += `
      <tr class="${status.toLowerCase()}">
        <td class="question-id-cell">
          ${testIdDisplay}
        </td>
        <td class="question-cell">
          ${question}
        </td>
        <td class="image-cell">${imageHtml}</td>
        <td class="status-cell">
          <span class="status-badge ${status.toLowerCase()}">${status}</span>
          <div class="test-details">${testInfo.join('')}</div>
        </td>
        <td class="score-cell">${(score * 100).toFixed(1)}%</td>
        <td class="response-cell">
          <details>
            <summary>View Response</summary>
            <pre class="response-content">${formattedResponse}</pre>
          </details>
        </td>
        <td class="failures-cell">${failedDetails.join('')}</td>
      </tr>`;
  });

  html += '</tbody></table>';

  // Enhanced summary
  const total = results.length;
  const passed = results.filter(r => r.success).length;
  const failed = total - passed;
  const avgScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / total;
  
  // Metrics from the overall evaluation
  const metrics = prompts[0].metrics || {};
  
  html += `
    <div class="summary-section">
      <h3>Evaluation Summary</h3>
      <div class="summary-grid">
        <div class="summary-card">
          <h4>Test Results</h4>
          <p><strong>Total Tests:</strong> ${total}</p>
          <p><strong>Passed:</strong> <span class="pass-count">${passed}</span></p>
          <p><strong>Failed:</strong> <span class="fail-count">${failed}</span></p>
          <p><strong>Success Rate:</strong> ${((passed/total) * 100).toFixed(1)}%</p>
        </div>
        <div class="summary-card">
          <h4>Performance</h4>
          <p><strong>Average Score:</strong> ${(avgScore * 100).toFixed(1)}%</p>
          <p><strong>Total Latency:</strong> ${metrics.totalLatencyMs || 'N/A'}ms</p>
          <p><strong>Requests:</strong> ${metrics.tokenUsage?.numRequests || 'N/A'}</p>
        </div>
        <div class="summary-card">
          <h4>Assertions</h4>
          <p><strong>Passed:</strong> ${metrics.assertPassCount || 0}</p>
          <p><strong>Failed:</strong> ${metrics.assertFailCount || 0}</p>
          <p><strong>Errors:</strong> ${metrics.testErrorCount || 0}</p>
        </div>
      </div>
    </div>`;

  document.getElementById('report').innerHTML = html;
});
