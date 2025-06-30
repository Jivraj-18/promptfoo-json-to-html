// script.js

document.getElementById('generate-btn').addEventListener('click', () => {
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
          <th>Question ID & Text</th>
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

    // Try to load and use the question_case_map.json mapping if available
    let questionMap = {};
    try {
      const questionMapInput = document.getElementById('question-map-input').value;
      if (questionMapInput.trim()) {
        questionMap = JSON.parse(questionMapInput);
      }
    } catch (e) {
      console.warn("Error parsing question map:", e);
    }
    
    // Find matching test ID from question_case_map
    let testId = "";
    if (Object.keys(questionMap).length > 0) {
      // Try to find matching question and assertion
      for (const [id, mapItem] of Object.entries(questionMap)) {
        if (mapItem.question === question) {
          if (item.gradingResult && item.gradingResult.componentResults && item.gradingResult.componentResults.length > 0) {
            const assertions = item.gradingResult.componentResults.map(cr => 
              cr.assertion && cr.assertion.value ? JSON.stringify(cr.assertion.value) : ""
            );
            
            const mapAssertion = mapItem.assertion && mapItem.assertion.value ? 
              JSON.stringify(mapItem.assertion.value) : "";
            
            if (assertions.includes(mapAssertion)) {
              testId = id;
              break;
            }
          }
        }
      }
    }

    // Add the test ID to the display if found
    const testIdDisplay = testId ? 
      `<div class="test-id-badge">${testId}</div>` : '';
    
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
        <td class="question-cell">
          ${testIdDisplay}
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
