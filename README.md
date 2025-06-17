# PromptFoo JSON to HTML Report

This project provides a simple GitHub Pages deployable solution that allows users to paste PromptFoo JSON evaluation output into a frontend interface and generate a detailed HTML report. The report includes:

- **Question**: The prompt/question evaluated
- **Image**: Base64 decoded image (if provided)
- **Test Cases**: Summary of all test cases with pass/fail status
- **Endpoint**: The provider endpoint used for evaluation
- **Details**: Detailed assertion information for failed cases, including expected values and raw student responses
- **Summary**: Overall count of total, passed, and failed evaluations

## Files

- `index.html`: Main HTML page with input and report sections
- `style.css`: Styling for the report
- `script.js`: Logic for parsing JSON, generating the report, and rendering HTML
- `some.json`: Sample PromptFoo JSON evaluation output (for testing)

## Usage

1. Clone or download this repository
2. Open `index.html` in a browser
3. Paste PromptFoo evaluation JSON into the text area
4. Click **Generate Report** to view the formatted report

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
