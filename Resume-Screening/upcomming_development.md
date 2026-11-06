# TalentDesk – Application Improvements and Bug Fixes

Act as a Senior Full-Stack Developer. I want to implement the following improvements in my existing TalentDesk recruitment application.

**Important development instructions:**
- First inspect the existing project structure, frontend components, backend APIs, database schema, and authentication implementation.
- Understand the existing functionality before modifying anything.
- Reuse existing components, APIs, authentication, and business logic wherever possible.
- Do not rebuild the application or unnecessarily change the existing architecture.
- Implement each requirement carefully and ensure existing functionality continues to work.
- Use reusable components and maintain consistent UI/UX throughout the application.

## 1. Form Validation and Toast Notifications

Implement proper client-side and server-side validation for all relevant forms.

Requirements:
- Validate all required fields.
- Validate email formats and other field-specific constraints.
- Display clear, field-specific validation messages.
- Prevent form submission when validation fails.
- Ensure backend validation errors are also displayed properly on the frontend.

**Toast notifications:**

Use a consistent toast notification system throughout the application.

Display success notifications for:
- User registration successful.
- User login successful.
- Profile updated successfully.
- Recruitment event created successfully.
- Recruitment event deleted successfully.
- Resume uploaded successfully.
- Resume deleted successfully.
- Other important successful operations.

Display error notifications for:
- API failures.
- Authentication errors.
- Invalid form submissions where appropriate.
- Resume upload failures.
- Event creation/deletion failures.
- Other failed operations.

Use a suitable toast library compatible with the existing frontend and shadcn/ui.

Do not use JavaScript `alert()` for notifications or confirmations.

## 2. Registration and Profile Update Form Consistency

The registration form and profile update form must use identical field definitions and data types.

This is about field consistency, not necessarily identical UI layouts.

For example:
- If Company Size is a dropdown during registration, it must also be a dropdown during profile updates.
- If a field uses predefined options during registration, the profile update form must use the same options.
- Maintain consistent labels, validation rules, field types, and allowed values.

Avoid maintaining separate, inconsistent definitions for the same profile fields.

Prefer reusable form schemas, validation rules, and field components.

## 3. Fix Profile Update and Email Authentication Behaviour

Currently, the profile settings page does not contain a password field, but saving updated profile information produces this error:

"Enter your current password to change your email."

Requirements:
- Do not add email or password fields to the profile update form.
- Email and password must remain fixed account credentials and should not be editable through this form.
- Only allow updates to the existing editable profile fields.
- Verify the user's authentication using the existing authentication token/session.
- Ensure the backend correctly identifies the authenticated user from the verified token.
- Do not trust a user ID supplied by the frontend to determine whose profile is being updated.
- Do not require the current password when updating ordinary profile information.
- Do not modify the existing email/password authentication flow.

Investigate the backend profile update API and fix the root cause rather than hiding the error on the frontend.

## 4. Recruitment Event Date Validation

Implement the following date restrictions in the event creation and event update forms.

**Start Date:**
- Today must be the earliest selectable date.
- Past dates must be disabled.

**End Date:**
- Must be at least one day after the selected start date.
- The minimum selectable end date must automatically update when the start date changes.
- Prevent selecting an end date earlier than or equal to the start date.
- Apply validation on both frontend and backend.

Ensure date restrictions work correctly even if the user manually modifies the request or bypasses frontend validation.

## 5. Remove Duplicate TalentDesk Branding

On the single recruitment event details page, the TalentDesk logo and name currently appear twice.

Investigate the header/layout structure and remove the duplicate branding.

Ensure:
- TalentDesk branding appears only once.
- The existing header layout remains consistent.
- Other pages are not affected.

## 6. Remove Uploaded Resumes and Their Embeddings

Add the ability to remove an individual resume from the uploaded resumes section of a recruitment event.

Requirements:
- Display a delete/remove action for each uploaded resume.
- Ask for confirmation using a small confirmation popup.
- After confirmation, delete the resume and update the UI immediately after successful backend processing.
- Delete the original PDF file from storage.
- Delete all associated ChromaDB embeddings and chunks.
- Delete the corresponding resume/candidate records from PostgreSQL.
- Ensure deletion is restricted to the authenticated user and the correct recruitment event.
- Ensure no orphaned embeddings, files, or database records remain.

**Important:** Use the existing resume ID and event ID to identify the exact resume. Do not delete records based only on a filename or candidate name.

If the cleanup process fails partially, handle the failure safely and provide meaningful feedback. Do not report successful deletion until the required cleanup has been completed.

## 7. Improve Shortlisted Candidate Results

Currently, after running a recruiter query, relevant resumes are shortlisted.

Improve the results UI to display useful candidate information instead of showing only basic matching information.

For each shortlisted candidate, display relevant available fields such as:
- Candidate name.
- Email or contact information, if available and permitted.
- Total years of experience, if available.

Do not invent missing candidate information. Display only information available in the candidate's resume or database.

**Resume PDF preview and download:**

Add a PDF icon or clearly identifiable resume action for each shortlisted candidate.

When clicked:
- Open the original PDF in an in-app PDF preview, preferably using a modal or dedicated preview page.
- Provide a download option.
- Ensure the PDF is retrieved through a secure backend endpoint.
- Verify that the authenticated user has permission to access the resume.
- Restrict access to resumes belonging to unauthorized users or recruitment events.

Keep the results clean and easy for recruiters to scan.

## 8. Replace Browser Alerts with Confirmation Popups

Remove all uses of JavaScript `alert()`, `confirm()`, and `prompt()` throughout the application.

Use appropriate shadcn/ui components instead.

Examples:
- Delete event → confirmation dialog.
- Delete resume → confirmation dialog.
- Destructive actions → clear warning and Cancel/Confirm buttons.
- Success/error messages → toast notifications.

Requirements:
- Popups should be compact and visually consistent.
- Use clear action labels.
- Confirmation should be required before destructive actions.
- Disable the confirm button while the operation is processing to prevent duplicate requests.
- Close the dialog after successful completion.
- Keep the dialog open and display an error if the operation fails.

## 9. Modernize All Dropdown Components Using shadcn/ui

The existing dropdown styling looks outdated.

Update all dropdown/select components throughout the application to use consistent modern shadcn/ui styling.

Inspect the entire application and update:
- Registration forms.
- Profile settings.
- Recruitment event forms.
- Search/filter sections.
- Any other dropdowns or select controls.

Requirements:
- Use shadcn/ui Select components where appropriate.
- Maintain consistent styling, spacing, typography, borders, focus states, and dropdown menus.
- Ensure proper keyboard navigation and accessibility.
- Maintain the existing dropdown options and underlying values.
- Do not change the business logic or stored values when changing the UI components.

Also inspect other form controls where needed so the dropdowns look consistent with the overall application design.

## 10. Add Dark and Light Theme Support

Implement a theme-switching feature with three options:
- Light
- Dark
- System (use the operating system preference)

**Placement:**
Add the theme selector in the application header, next to the Workspace section.

Requirements:
- Use shadcn/ui-compatible theme management, preferably `next-themes` if the application uses Next.js.
- Support both light and dark themes across the entire application.
- Ensure all pages, dialogs, dropdowns, cards, tables, forms, and toasts adapt correctly.
- Avoid hardcoded colors that break in dark mode.
- Use consistent semantic theme tokens such as background, foreground, card, border, muted, and primary.
- Persist the user's selected theme across page reloads.
- Use the System option to follow OS preferences.
- Prevent unnecessary theme flashing during page load.

The theme selector should be compact and visually consistent with the existing header.

## 11. Final Testing and Verification

After implementing the changes, verify the following workflows:

1. Register a new user and check success/error notifications.
2. Log in and verify the success notification.
3. Update the profile without entering a password.
4. Confirm registration and profile update fields use consistent types and options.
5. Attempt to select a past start date.
6. Attempt to select an invalid end date.
7. Create a recruitment event and verify its success notification.
8. Upload multiple resumes.
9. Delete an individual uploaded resume and verify its PDF, PostgreSQL records, and ChromaDB embeddings are removed.
10. Run a recruiter query and verify shortlisted candidate details.
11. Preview and download a shortlisted candidate's PDF.
12. Delete a recruitment event and verify the existing event deletion behaviour remains correct.
13. Verify all confirmations use custom dialogs instead of browser alerts.
14. Test dropdowns throughout the application.
15. Switch between Light, Dark, and System themes.
16. Check responsiveness on desktop and mobile.

## Final Instructions

- Implement changes in the existing codebase.
- Do not introduce duplicate components or unnecessary dependencies.
- Do not change the RAG retrieval, ranking, or shortlisting logic unless required to expose the existing candidate information.
- Maintain authentication and authorization checks on protected backend operations.
- Keep the code modular, reusable, and maintainable.
- Do not use mock data or hardcoded candidate results.
- Do not claim a feature is complete without testing its actual workflow.
- At the end, provide a concise summary of modified files, implemented features, API/database changes, and tests performed.
- Clearly mention any requirements that could not be completed.













login button on first page required some gap fro register button
password field width need to equal to email field - login form 
extra validation message on page not required - toaster is sufficiant 


when we create the event then it create with status draft ( by default ) 
remove the status feild drop down in event create form - also from edit event form 
give option ( button ) of edit when event is in draft state 
add one button between the edit and delete - called start event ==> then that event shift to start state ==> remove the edit access 

if event in draft state then that button is - start event 
if event is in open state then that btn is - close event 

when event is in close state then we not able to add , delete resume - also not able to query new questions 

show one message this event is closed - 






