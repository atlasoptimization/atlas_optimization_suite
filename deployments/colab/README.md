# Colab Export Deployment

Colab Export is a zero-hosting demo path. Atlas remains the graphical modeling environment, and Google Colab executes the generated CVXPY notebook.

## Export Notebook

1. Open Atlas.
2. Build or load a model, for example `Tiny LP`.
3. Use `File -> Export to Colab notebook` or `Run -> Export to Colab notebook`.
4. Save the generated `.ipynb` file.
5. Upload it to Google Colab, or open it from Google Drive.
6. Run all cells.

For built-in examples, Atlas uses clear filenames:

- `atlas_tiny_lp.ipynb`
- `atlas_least_squares.ipynb`
- `atlas_ridge_regression.ipynb`

## What The Notebook Contains

- Title and Atlas-generated description.
- `%pip install -q cvxpy`.
- CVXPY imports and generated model code.
- `problem.solve()`.
- Prints for solver status, objective value, and variables.
- Expected-result notes for built-in examples when known.

## Limitations

- Colab Export does not solve inside the GUI.
- The exported notebook uses the frontend CVXPY-first code generator for the current supported Atlas IR subset.
- Advanced atoms or incomplete model connections may require manual notebook edits.

## Privacy Note

Uploading a notebook or data files to Colab sends that content to Google infrastructure. Do not use Colab Export for private or regulated data unless that is acceptable for your workflow.
