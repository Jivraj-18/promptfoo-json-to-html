# PromptFoo JSON to HTML Report Generator

A professional, GitHub Pages deployable solution that converts PromptFoo evaluation JSON output into detailed, visually appealing HTML reports. Perfect for analyzing and sharing AI/LLM evaluation results.

## ✨ Features

### 📊 Advanced Question Mapping
- **Exact Matching**: Perfect matches between question text and assertion details
- **Fuzzy Matching**: Uses Levenshtein distance for partial question matches (60%+ similarity)
- **Pattern-Based Matching**: Extracts question numbers for intelligent ID generation
- **Confidence Scoring**: Each mapping includes a confidence percentage (0-100%)
- **Visual Indicators**: Color-coded badges show mapping quality and source
- **Mapping Statistics**: Detailed breakdown of mapping success rates in report summary
- **Validation Tools**: Built-in validation for question_case_map.json structure
- **Separated Question ID & Text**: Displays test question IDs in a separate column for better readability
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
- **Enhanced Question ID Badges**: Show confidence scores and mapping types
- **File Upload Support**: Drag-and-drop or click to upload JSON files
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
   - **Question ID**: ID from question_case_map.json matching the question text
   - **Question Text**: The test question/prompt
   - **Image**: Base64 decoded images (if present)
   - **Test Status**: Pass/fail indicators with detailed test descriptions
   - **Score**: Percentage score for each test case
   - **Response**: Student endpoint response (expandable)
   - **Failed Assertions**: Detailed failure information for debugging

3. **Summary Section**
   - Test results overview
   - Performance metrics
   - Assertion statistics
   - **Question Mapping Statistics**: Success rates and mapping quality metrics
   - **Interactive Legend**: Visual guide for understanding question ID badge colors

## 🔧 Enhanced Features

### Mapping Quality Indicators
The system now provides visual feedback on mapping quality:

- **🟢 Exact Match** (Green): Perfect question and assertion match (90-100% confidence)
- **🟡 Fuzzy Match** (Blue): Partial question match using similarity algorithm (60-89% confidence)  
- **🟣 Pattern/Special** (Purple): Pattern-based or special logic matching (50-89% confidence)
- **🟠 Generated** (Orange): Automatically generated from available data
- **🔴 No Match** (Red): No mapping found, ID generated from question text

### Debug and Validation Tools
- **Console Logging**: Detailed mapping information in browser console
- **Mapping Statistics**: Summary of all mapping attempts and success rates
- **Validation Warnings**: Alerts for duplicate questions or malformed mapping data
- **File Upload Validation**: JSON validation before processing

## 🚀 Usage

### Local Development
1. Clone or download this repository
2. Ensure `question_case_map.json` is present in the root directory
3. Open `index.html` in a web browser
4. Paste your PromptFoo evaluation JSON into the textarea
5. Click **Generate Report** to view the formatted report with mapped question IDs

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
