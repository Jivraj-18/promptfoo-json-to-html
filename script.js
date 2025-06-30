// script.js

// Enhanced debugging function to help identify mapping issues
function logMappingDetails(question, assertions, mapResult) {
  console.group("🔍 Question Mapping Details");
  console.log("📝 Question:", question.substring(0, 100) + (question.length > 100 ? '...' : ''));
  console.log("🎯 Assertions:", assertions?.map(a => `${a.type}: ${a.value?.substring?.(0, 50) || a.value}`));
  
  if (mapResult && mapResult.id) {
    console.log(`✅ Mapping Result: ${mapResult.id}`);
    console.log(`🎯 Confidence: ${mapResult.confidence}%`);
    console.log(`📊 Match Type: ${mapResult.matchType}`);
    
    // Color-code based on confidence
    if (mapResult.confidence >= 90) {
      console.log("🟢 High confidence mapping");
    } else if (mapResult.confidence >= 70) {
      console.log("🟡 Medium confidence mapping");
    } else if (mapResult.confidence >= 50) {
      console.log("🟠 Low confidence mapping");
    } else {
      console.log("🔴 Very low confidence mapping");
    }
  } else {
    console.log("❌ No mapping found");
  }
  
  console.groupEnd();
}

// Add mapping statistics tracking
const mappingStats = {
  total: 0,
  exact: 0,
  fuzzy: 0,
  generated: 0,
  failed: 0
};

function updateMappingStats(matchType) {
  mappingStats.total++;
  switch (matchType) {
    case 'exact-with-assertion':
    case 'exact-question':
    case 'exact-question-only':
      mappingStats.exact++;
      break;
    case 'fuzzy-match':
      mappingStats.fuzzy++;
      break;
    case 'pattern-based':
    case 'special-json':
      mappingStats.generated++;
      break;
    default:
      mappingStats.failed++;
  }
}

function logMappingStatistics() {
  console.group("📊 Mapping Statistics Summary");
  console.log(`Total Questions Processed: ${mappingStats.total}`);
  console.log(`✅ Exact Matches: ${mappingStats.exact} (${((mappingStats.exact/mappingStats.total)*100).toFixed(1)}%)`);
  console.log(`🔍 Fuzzy Matches: ${mappingStats.fuzzy} (${((mappingStats.fuzzy/mappingStats.total)*100).toFixed(1)}%)`);
  console.log(`🎯 Generated/Pattern: ${mappingStats.generated} (${((mappingStats.generated/mappingStats.total)*100).toFixed(1)}%)`);
  console.log(`❌ Failed Mappings: ${mappingStats.failed} (${((mappingStats.failed/mappingStats.total)*100).toFixed(1)}%)`);
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

// Validation function for question_case_map.json
function validateQuestionCaseMap(questionMap) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    stats: {
      totalEntries: 0,
      entriesWithAssertions: 0,
      entriesWithoutQuestions: 0,
      duplicateQuestions: []
    }
  };

  if (!questionMap || typeof questionMap !== 'object') {
    validation.isValid = false;
    validation.errors.push("Question case map is not a valid object");
    return validation;
  }

  const questionTexts = new Set();
  const duplicates = new Set();

  for (const [id, entry] of Object.entries(questionMap)) {
    validation.stats.totalEntries++;

    // Check for required question field
    if (!entry.question || typeof entry.question !== 'string') {
      validation.warnings.push(`Entry "${id}" missing or invalid question field`);
      validation.stats.entriesWithoutQuestions++;
      continue;
    }

    // Check for duplicate questions
    if (questionTexts.has(entry.question)) {
      duplicates.add(entry.question);
    } else {
      questionTexts.add(entry.question);
    }

    // Count entries with assertions
    if (entry.assertion) {
      validation.stats.entriesWithAssertions++;
      
      // Validate assertion structure
      if (!entry.assertion.type) {
        validation.warnings.push(`Entry "${id}" has assertion without type`);
      }
    }
  }

  // Report duplicates
  if (duplicates.size > 0) {
    validation.stats.duplicateQuestions = Array.from(duplicates);
    validation.warnings.push(`Found ${duplicates.size} duplicate question(s): ${Array.from(duplicates).join(', ')}`);
  }

  console.group("📋 Question Case Map Validation");
  console.log(`✅ Total entries: ${validation.stats.totalEntries}`);
  console.log(`🎯 Entries with assertions: ${validation.stats.entriesWithAssertions}`);
  console.log(`⚠️ Entries without questions: ${validation.stats.entriesWithoutQuestions}`);
  
  if (validation.errors.length > 0) {
    console.log("❌ Errors:", validation.errors);
  }
  
  if (validation.warnings.length > 0) {
    console.log("⚠️ Warnings:", validation.warnings);
  }
  
  console.groupEnd();

  return validation;
}

// Enhanced matching function with fuzzy matching and better fallback logic
function findMatch(question, assertions, questionMap) {
  if (!question || typeof question !== 'string') return { id: null, confidence: 0, matchType: 'none' };
  
  // Special case: check if this is an is-json assertion
  if (assertions && assertions.length > 0) {
    for (const assertion of assertions) {
      if (assertion.type === 'is-json') {
        // For is-json assertions, extract questionId from the question
        const questionMatch = question.match(/question\s*(\d+)/i);
        const questionId = questionMatch ? `question${questionMatch[1]}` : "question1";
        return { id: `${questionId}_test0`, confidence: 95, matchType: 'special-json' };
      }
    }
  }
  
  // 1. Try exact question match first (highest confidence)
  for (const [id, mapItem] of Object.entries(questionMap)) {
    if (mapItem.question === question) {
      // If we have assertions to match
      if (assertions && assertions.length > 0 && mapItem.assertion) {
        const mapAssertionValue = mapItem.assertion.value ? JSON.stringify(mapItem.assertion.value) : "";
        const mapAssertionType = mapItem.assertion.type || "";
        
        // Look through all the test assertions to find a match
        for (const assertion of assertions) {
          // Match exactly on both type and value
          if (assertion.type === mapAssertionType) {
            if (assertion.value === mapAssertionValue || 
                (assertion.value !== null && JSON.stringify(assertion.value) === mapAssertionValue)) {
              return { id, confidence: 100, matchType: 'exact-with-assertion' };
            }
          }
        }
        // Question matches but assertion doesn't
        return { id, confidence: 80, matchType: 'exact-question-only' };
      } else {
        // Perfect match without assertions
        return { id, confidence: 90, matchType: 'exact-question' };
      }
    }
  }
  
  // 2. Try fuzzy question matching (medium confidence)
  const questionLower = question.toLowerCase().trim();
  let bestMatch = { id: null, confidence: 0, matchType: 'none' };
  
  for (const [id, mapItem] of Object.entries(questionMap)) {
    if (mapItem.question) {
      const mapQuestionLower = mapItem.question.toLowerCase().trim();
      
      // Check for partial matches
      if (questionLower.includes(mapQuestionLower) || mapQuestionLower.includes(questionLower)) {
        const similarity = calculateSimilarity(questionLower, mapQuestionLower);
        if (similarity > bestMatch.confidence && similarity > 60) {
          bestMatch = { id, confidence: similarity, matchType: 'fuzzy-match' };
        }
      }
    }
  }
  
  if (bestMatch.id) return bestMatch;
  
  // 3. Try pattern-based matching (low confidence)
  const questionNumMatch = question.match(/question\s*(\d+)/i);
  if (questionNumMatch) {
    const questionNum = questionNumMatch[1];
    // Look for IDs that contain this question number
    for (const id of Object.keys(questionMap)) {
      if (id.includes(`question${questionNum}`)) {
        return { id, confidence: 50, matchType: 'pattern-based' };
      }
    }
  }
  
  return { id: null, confidence: 0, matchType: 'no-match' };
}

// Helper function to calculate string similarity
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 100;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return Math.round(((longer.length - editDistance) / longer.length) * 100);
}

// Levenshtein distance calculation
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

document.getElementById('generate-btn').addEventListener('click', async () => {
  // Reset mapping statistics
  Object.assign(mappingStats, { total: 0, exact: 0, fuzzy: 0, generated: 0, failed: 0 });
  
  // Load and validate question_case_map.json
  const questionMap = await loadQuestionCaseMap();
  
  // Validate the question map if it exists
  if (Object.keys(questionMap).length > 0) {
    validateQuestionCaseMap(questionMap);
  } else {
    console.warn("⚠️ No question_case_map.json found or file is empty. IDs will be generated automatically.");
  }
  
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
    
    // Find question ID using enhanced question_case_map.json matching
    let fullId = 'N/A';
    let confidence = 0;
    let matchType = 'none';
    let badgeClass = 'test-id-badge';
    
    // Extract assertions from the test data
    let assertions = [];
    if (item.gradingResult && item.gradingResult.componentResults && item.gradingResult.componentResults.length > 0) {
      // Get all assertion details for exact matching
      assertions = item.gradingResult.componentResults.map(cr => {
        if (cr.assertion) {
          return {
            value: cr.assertion.value ? JSON.stringify(cr.assertion.value) : "",
            type: cr.assertion.type || ""
          };
        }
        return null;
      }).filter(a => a); // Remove nulls
    }
    
    // Try to find a match in the question_case_map
    if (Object.keys(questionMap).length > 0) {
      const matchResult = findMatch(question, assertions, questionMap);
      // Log mapping details to console for debugging
      logMappingDetails(question, assertions, matchResult);
      
      if (matchResult && matchResult.id) {
        fullId = matchResult.id;
        confidence = matchResult.confidence;
        matchType = matchResult.matchType;
        updateMappingStats(matchType);
        
        // Set badge class based on match type and confidence
        if (matchType.includes('exact')) {
          badgeClass += ' id-mapped';
        } else if (matchType === 'fuzzy-match') {
          badgeClass += ' id-probable';
        } else if (matchType === 'special-json' || matchType === 'pattern-based') {
          badgeClass += ' id-special';
        }
      } else {
        console.warn(`❌ No mapping found for question: "${question.substring(0, 50)}..."`);
        updateMappingStats('no-match');
      }
    }
    
    // Enhanced fallback ID generation if no match found in question_case_map
    if (fullId === 'N/A') {
      // Try to get ID from the item directly
      const itemTestId = item.testId || '';
      const itemQuestionId = item.questionId || '';
      
      if (itemQuestionId && itemTestId) {
        fullId = `${itemQuestionId}_${itemTestId}`;
        badgeClass += ' id-generated';
        matchType = 'from-item';
      } else if (item.id && typeof item.id === 'string') {
        fullId = item.id;
        badgeClass += ' id-generated';
        matchType = 'from-id';
      } else {
        // Extract numbers from test case name or generate based on index
        const questionMatch = question.match(/question\s*(\d+)/i);
        const testMatch = question.match(/test\s*(\d+)/i);
        
        const questionNum = questionMatch ? questionMatch[1] : index + 1;
        const testNum = testMatch ? testMatch[1] : 0;
        
        fullId = `question${questionNum}_test${testNum}`;
        badgeClass += ' id-not-found';
        matchType = 'generated';
      }
      updateMappingStats(matchType);
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

    // Create enhanced test ID badge with confidence indicator
    const confidenceDisplay = confidence > 0 ? `<span class="confidence">(${confidence}%)</span>` : '';
    const testIdDisplay = `<div class="${badgeClass}">${fullId} ${confidenceDisplay}</div>`;
    
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

  // Log final mapping statistics
  logMappingStatistics();

  // Enhanced summary with mapping statistics
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
        <div class="summary-card">
          <h4>Question Mapping</h4>
          <p><strong>Exact Matches:</strong> ${mappingStats.exact}</p>
          <p><strong>Fuzzy Matches:</strong> ${mappingStats.fuzzy}</p>
          <p><strong>Generated IDs:</strong> ${mappingStats.generated}</p>
          <p><strong>Mapping Rate:</strong> ${(((mappingStats.exact + mappingStats.fuzzy)/mappingStats.total) * 100).toFixed(1)}%</p>
        </div>
      </div>
      
      <!-- Mapping Legend -->
      <div class="mapping-legend">
        <h4>Question ID Legend:</h4>
        <div class="id-legend">
          <span class="test-id-badge id-mapped">Exact Match</span>
          <span class="test-id-badge id-probable">Fuzzy Match</span>
          <span class="test-id-badge id-special">Pattern/Special</span>
          <span class="test-id-badge id-generated">Generated</span>
          <span class="test-id-badge id-not-found">No Match</span>
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
