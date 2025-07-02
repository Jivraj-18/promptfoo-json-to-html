// script.js

// Helper function to load and parse the question-case mapping
async function loadQuestionCaseMapping() {
  try {
    const response = await fetch('./question_case_map.json');
    const mapping = await response.json();
    return mapping;
  } catch (error) {
    console.warn('Could not load question_case_map.json:', error);
    return {};
  }
}

// Helper function to find the case for a given question
function findCaseForQuestion(question, mapping) {
  if (!question || !mapping) return 'N/A';
  
  // Direct match
  if (mapping[question]) {
    return mapping[question];
  }
  
  // Fuzzy matching - check if question contains any of the mapped questions
  const normalizedQuestion = question.toLowerCase().trim();
  for (const mappedQuestion in mapping) {
    const normalizedMapped = mappedQuestion.toLowerCase().trim();
    if (normalizedQuestion.includes(normalizedMapped) || normalizedMapped.includes(normalizedQuestion)) {
      return mapping[mappedQuestion];
    }
  }
  
  return 'N/A';
}

document.getElementById('generate-btn').addEventListener('click', async () => {
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

  // Load the question-case mapping
  const questionCaseMapping = await loadQuestionCaseMapping();

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
          <th>Question</th>
          <th>Case</th>
          <th>Image</th>
          <th>Test Status</th>
          <th>HTTP Status</th>
          <th>Request Metadata</th>
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
    
    // Find the corresponding case for this question
    const mappedCase = findCaseForQuestion(question, questionCaseMapping);
    
    // Extract HTTP status code and metadata if available
    let httpStatusCode = 'N/A';
    let requestMetadata = '';
    
    // Check for HTTP status in metadata
    if (item.metadata && item.metadata.http && item.metadata.http.status) {
      const statusCode = item.metadata.http.status;
      httpStatusCode = statusCode;
      
      // For 4xx or 5xx status codes, provide detailed metadata
      if (statusCode >= 400 && statusCode < 600) {
        requestMetadata = `
          <details>
            <summary>HTTP ${statusCode} Error</summary>
            <pre class="metadata-content">${JSON.stringify(item.metadata.http, null, 2)}</pre>
          </details>
        `;
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
        <td class="question-cell">${question}</td>
        <td class="case-cell">${mappedCase}</td>
        <td class="image-cell">${imageHtml}</td>
        <td class="status-cell">
          <span class="status-badge ${status.toLowerCase()}">${status}</span>
          <div class="test-details">${testInfo.join('')}</div>
        </td>
        <td class="http-status-cell">${httpStatusCode}</td>
        <td class="request-metadata-cell">${requestMetadata}</td>
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


  document.getElementById('report').innerHTML = html;
  
  // Add class to HTTP status cells with error codes (4xx or 5xx)
  const statusCells = document.querySelectorAll('.http-status-cell');
  statusCells.forEach(cell => {
    const statusCode = parseInt(cell.textContent);
    if (statusCode >= 400 && statusCode < 600) {
      cell.classList.add('error');
    }
  });
});
