# PromptFoo JSON to HTML Report Generator

A professional, GitHub Pages deployable solution that converts PromptFoo evaluation JSON output into detailed, visually appealing HTML reports. Perfect for analyzing and sharing AI/LLM evaluation results.

## ✨ Features

### 📊 Comprehensive Report Generation
- **Question ID & Text**: Display test question IDs (e.g., "question1_test1") along with questions
- **Automatic Question ID Mapping**: Automatically loads question_case_map.json from the local file system to map results to question IDs
- **Question Mapping**: Optional question_case_map.json support for test case identification
- **Image Support**: Automatic base64 image decoding with format detection (WebP, PNG, JPEG)
- **Test Status**: Visual pass/fail indicators for all test cases
- **Scoring**: Percentage-based scoring with color-coded indicators
- **Response Details**: Expandable sections showing student endpoint responses
- **Assertion Details**: Detailed failure information including expected vs actual results

### 📈 Advanced Summary Statistics
- **Test Results**: Total tests, pass/fail counts, success rates
- **Performance Metrics**: Average scores, latency information, request counts
- **Assertion Breakdown**: Detailed assertion pass/fail statistics

### 🎨 Professional UI/UX
- Modern gradient design with responsive layout
- Color-coded status indicators (green for pass, red for fail)
- Hover effects and smooth transitions
- Mobile-friendly responsive design
- Expandable response sections to manage content density

### 🔧 Technical Features
- **Error Handling**: Robust JSON validation and error messages
- **Format Detection**: Automatic image format detection from metadata
- **Cross-browser Support**: Works on all modern browsers
- **GitHub Pages Ready**: Zero-configuration deployment

## 📋 Report Structure

The generated HTML report includes:

1. **Header Section**
   - Evaluation ID and timestamp
   - Endpoint being evaluated (e.g., `https://tds-project-1-opal-nine.vercel.app/query`)

2. **Main Table**
   - **Question**: The test question/prompt
   - **Image**: Base64 decoded images (if present)
   - **Test Status**: Pass/fail indicators with detailed test descriptions
   - **Score**: Percentage score for each test case
   - **Response**: Student endpoint response (expandable)
   - **Failed Assertions**: Detailed failure information for debugging

3. **Summary Section**
   - Test results overview
   - Performance metrics
   - Assertion statistics

## 🚀 Usage

### Local Development
1. Clone or download this repository
2. Place your `question_case_map.json` file in the root directory (or prepare it for input)
3. Open `index.html` in a web browser
4. Paste your PromptFoo evaluation JSON into the first textarea
5. If using a custom question map, paste it into the second textarea (otherwise, the local file will be used automatically)
6. Click **Generate Report** to view the formatted report

### Example JSON Structure
```json
{
  "evalId": "eval-xxx",
  "results": {
    "prompts": [{"provider": "https://your-endpoint.com/query"}],
    "results": [
      {
        "vars": {
          "question": "Your test question",
          "image": "base64-encoded-image-data"
        },
        "response": {"raw": "endpoint response"},
        "success": true,
        "score": 0.85,
        "gradingResult": {
          "componentResults": [...]
        }
      }
    ]
  }
}
```

## Deploying to GitHub Pages

1. Create a new repository on GitHub (e.g., `promptfoo_json_to_html`).
2. Add this project to the repo and push your code:

   ```bash
   git init
   git remote add origin https://github.com/<username>/<repository>.git
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```
3. In your repository on GitHub, go to **Settings > Pages**.
4. Under **Source**, select **Branch: main** and **Folder: /** (root). Click **Save**.
5. After a few minutes, your site will be live at:
   `https://<username>.github.io/<repository>/`

### Automatic Deployment with GitHub Actions

To deploy on every push to **main**, add a workflow:

1. Create the directory `.github/workflows` in your repo.
2. Add a file `deploy.yml` with:

   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches:
         - main

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Deploy
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./
   ```

3. Commit and push the workflow file; GitHub Actions will build and publish your site automatically when you push to **main**.

## Customization

- Modify `style.css` to change styling
- Update `script.js` to adjust report structure or data handling

## License

MIT License
