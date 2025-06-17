// script.js

document.getElementById('generate-btn').addEventListener('click', () => {
  const input = document.getElementById('json-input').value;
  let data;
  try {
    data = JSON.parse(input);
  } catch (e) {
    alert('Invalid JSON');
    return;
  }

  const prompts = data.results.prompts;
  const results = data.results.results;
  const endpoint = prompts[0].provider;

  let html = '<table><thead><tr>' +
    '<th>Question</th>' +
    '<th>Image</th>' +
    '<th>Test Cases</th>' +
    '<th>Endpoint</th>' +
    '<th>Details</th>' +
    '</tr></thead><tbody>';

  results.forEach(item => {
    const vars = item.vars || item.testCase.vars;
    const rawResponse = item.response && item.response.raw ? item.response.raw : '';
    const question = vars.question || '';
    let imageHtml = '';
    if (vars.image) {
      let src = '';
      if (typeof vars.image === 'object') {
        // image as {name: filename, data: base64}
        const ext = vars.image.name.split('.').pop().toLowerCase();
        src = `data:image/${ext};base64,${vars.image.data}`;
      } else if (typeof vars.image === 'string') {
        // image as data URI or raw base64
        if (vars.image.startsWith('data:image')) {
          src = vars.image;
        } else {
          const ext = vars.image.split('.').pop().toLowerCase();
          src = `data:image/${ext};base64,${vars.image}`;
        }
      }
      imageHtml = `<img class=\\"report-image\\" src=\\"${src}\\" alt=\\"image\\"/>`;
    }

    // test cases
    const testInfo = [];
    const details = [];
    item.gradingResult.componentResults.forEach(cr => {
      const assertion = cr.assertion;
      const pass = cr.pass;
      const testCase = cr.assertion && cr.assertion.transform ? cr.assertion.transform : '';
      const testCaseDesc = assertion && assertion.transform ? assertion.transform : assertion && assertion.type ? assertion.type : '';
      testInfo.push(`<div>${pass ? '✔️' : '❌'} ${testCaseDesc}</div>`);
      if (!pass) {
        details.push(`
          <li>
            <strong>Test:</strong> ${testCaseDesc}<br>
            <strong>Expected:</strong> ${JSON.stringify(assertion.value)}<br>
            <strong>Response:</strong> <pre>${rawResponse}</pre>
          </li>
        `);
      }
    });

    html += '<tr>' +
      `<td>${question}</td>` +
      `<td>${imageHtml}</td>` +
      `<td>${testInfo.join('')}</td>` +
      `<td>${endpoint}</td>` +
      `<td><ul class=\"details-list\">${details.join('')}</ul></td>` +
      '</tr>';
  });

  html += '</tbody></table>';

  // summary
  const total = results.length;
  const passed = results.filter(r => r.success).length;
  const failed = total - passed;
  html += `<div class=\"summary\">Total: ${total}, Passed: ${passed}, Failed: ${failed}</div>`;

  document.getElementById('report').innerHTML = html;
});
