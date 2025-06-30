// script.js

// Simple debugging function
function logMappingDetails(question, mapResult) {
  if (mapResult && mapResult.id) {
    console.log(`✅ Found mapping: "${question}" -> ${mapResult.id}`);
  } else {
    console.log(`❌ No mapping found for: "${question}"`);
  }
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

// Simple exact string matching function
function findMatch(question, questionMap) {
  if (!question || typeof question !== 'string') return null;
  
  // Look for exact string match in question_case_map.json
  for (const [id, mapItem] of Object.entries(questionMap)) {
    if (mapItem.question === question) {
      return { id };
    }
  }
  
  return null;
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
    
    // Try to find an exact match in the question_case_map
    if (Object.keys(questionMap).length > 0) {
      const matchResult = findMatch(question, questionMap);
      logMappingDetails(question, matchResult);
      
      if (matchResult && matchResult.id) {
        fullId = matchResult.id;
      }
    }
    
    // If no match found in question_case_map, generate an ID
    if (fullId === 'N/A') {
      // Extract numbers from test case name or generate based on index
      const questionMatch = question.match(/question\s*(\d+)/i);
      const testMatch = question.match(/test\s*(\d+)/i);
      
      const questionNum = questionMatch ? questionMatch[1] : index + 1;
      const testNum = testMatch ? testMatch[1] : 0;
      
      fullId = `question${questionNum}_test${testNum}`;
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

    // Create test ID badge
    const testIdDisplay = `<div class="test-id-badge">${fullId}</div>`;
    
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

// File upload functionality
document.getElementById('upload-btn').addEventListener('click', () => {
  document.getElementById('json-file-upload').click();
});

document.getElementById('json-file-upload').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Validate JSON before setting
        JSON.parse(e.target.result);
        document.getElementById('json-input').value = e.target.result;
        console.log(`✅ Successfully loaded JSON file: ${file.name}`);
      } catch (error) {
        alert(`Invalid JSON file: ${error.message}`);
        console.error('JSON parsing error:', error);
      }
    };
    reader.readAsText(file);
  }
});
