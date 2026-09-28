# MOM Sign-Off Option

## Build
- Add a cloud-saved `Sign-Off Required` setting to each customer visit/MOM, defaulting to off.
- Add the toggle to the MOM edit form and show its state in the preview.
- When enabled, append the supplied acknowledgment wording and two equal signature blocks to the PDF.
- Automatically use the selected plant's customer company name on the left and keep Forbes Marshall fixed on the right.
- Measure remaining PDF space before drawing the section; move the entire sign-off block to a new page when it cannot fit.

## Verification
- Check the app compiles and the MOM editor saves the setting.
- Download PDFs with the toggle off and on.
- Visually inspect the rendered PDF pages to confirm alignment, branding, wording, and no split sign-off section.
