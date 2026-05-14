# User Manual - Test Creator

## Table of Contents
- [Getting Started](#getting-started)
- [Teacher Guide](#teacher-guide)
  - [Creating a Test](#creating-a-test)
  - [Editing a Test](#editing-a-test)
  - [Managing Questions](#managing-questions)
  - [Guest Access Codes](#guest-access-codes)
  - [Publishing a Test](#publishing-a-test)
  - [Viewing Results](#viewing-results)
- [Student Guide](#student-guide)
  - [Taking a Test (Registered)](#taking-a-test-registered)
  - [Taking a Test (Guest)](#taking-a-test-guest)
- [Guest Access](#guest-access)
  - [How Access Codes Work](#how-access-codes-work)
  - [Access Code vs Guest Token](#access-code-vs-guest-token)

---

## Getting Started

### Registration
1. Go to the registration page
2. Enter your name, email, and password
3. Select your role: **Teacher** or **Student**
4. Click **Register**

### Login
1. Go to the login page
2. Enter your email and password
3. You will be redirected to your dashboard

---

## Teacher Guide

### Creating a Test

1. Navigate to **Dashboard** > **Create Test**
2. Fill in the test details:
   - **Title** - Name of the test (min 5 characters)
   - **Description** - Brief description
   - **Number of Questions** - How many questions (1-100)
   - **Duration** - Time limit in minutes (5-480)
   - **Passing Score** - Minimum percentage to pass (0-100%)
3. Click **Next: Add Questions**
4. For each question:
   - Enter the question text
   - Enter 4 answer options
   - Select the correct answer (radio button)
   - Optionally add an explanation
5. Click **Create Test**

The test is created in **DRAFT** status.

### Editing a Test

1. From the Dashboard, click on a test to open it
2. Use the tabs to navigate:
   - **Test Details** - Update title, description, duration, passing score
   - **Questions** - Add, edit, or delete questions
   - **Settings** - Configure scheduling, shuffling, and test actions

> **Note:** Only tests in **DRAFT** status can be edited. Published tests cannot be modified.

### Managing Questions

#### Adding a Question
1. Go to the **Questions** tab
2. Click **+ Add Question**
3. Enter the question text
4. Add at least 2 options (will be padded to 4 if fewer)
5. Select the correct answer
6. Click **Save Question**

#### Editing a Question
1. Click **Edit** next to the question
2. Modify the question text, options, or correct answer
3. Click **Save Question**

#### Deleting a Question
1. Click **Delete** next to the question
2. Confirm the deletion

### Guest Access Codes

Guest access codes allow students to take a test **without registering** for an account. This is ideal for classroom settings, walk-in assessments, or one-off quizzes.

#### How to Generate an Access Code

1. Open the test in edit mode
2. In the **Test Details** tab, find the **Access Code** field
3. Click the **Generate** button
4. A unique code will be created (format: `guest_XXXXXX`, e.g., `guest_a3f2b1`)
5. Share this code with your students

#### Key Behaviors

- **One code per test** - Each test has one access code at a time
- **Reusable** - Multiple students can use the same access code; each student gets an independent test session
- **Persistent** - The code stays the same until you regenerate it
- **Regenerating** - Clicking **Generate** again replaces the old code with a new one. The old code immediately stops working
- **Requires Published status** - Students can only use the access code to find tests that are **PUBLISHED**. Draft or archived tests will not be found

#### Sharing the Code

Share the access code with students through any channel:
- Write it on a whiteboard
- Send via email, chat, or LMS
- Include it in printed instructions

Students enter the code at the **Guest Test** page to find and start the test.

### Publishing a Test

1. Go to the **Settings** tab
2. Click **Publish Test**
3. Confirm the action

Once published:
- Students can find and take the test
- Guest access codes become active
- The test can no longer be edited
- You can still archive it later

### Viewing Results

- Navigate to **Analytics** from the sidebar
- Select a test to view:
  - Overall statistics (average score, pass rate)
  - Individual student results
  - Question-level analytics
  - Export results as CSV

---

## Student Guide

### Taking a Test (Registered)

1. Login with your student account
2. Go to **Available Tests** on your dashboard
3. Click **Start Test** on the test you want to take
4. Answer each question within the time limit
5. Click **Submit** when done
6. View your results immediately

### Taking a Test (Guest)

If your teacher gave you an **access code**, you can take the test without an account:

1. Go to the **Guest Test** page (`/pages/guest/enter-code.html`)
2. Enter the access code provided by your teacher (e.g., `guest_a3f2b1`)
3. Click **Find Test**
4. Review the test details (title, duration, number of questions, passing score)
5. Enter your name
6. Click **Start Test**
7. Answer all questions within the time limit
8. Click **Submit Test** or **Exit** to finish — see details below

#### Using a Different Code

If you entered the wrong access code or want to try a different test, click the **← Different Code**
button on the test info screen. This will:

- Cancel the pending session (clean up on the server)
- Clear the access code field
- Return you to the initial "Enter access code" screen, as if you just arrived

No test data is retained — you start fresh.

#### Submitting or Exiting the Test

During the test, you have two options to finish:

- **Submit Test** — Opens a confirmation dialog showing how many questions you've answered, how many
  are unanswered, and the remaining time. Click **Submit Test** to confirm. Your test is graded and
  you see your results immediately.

- **Exit** — Opens a separate confirmation dialog with the same summary. Click **Yes, Exit Test** to
  confirm. This behaves identically to submitting — your answered questions are scored and you see
  your results. Use this if you want to leave the test early without answering all questions.

In both cases, only answered questions are scored. You cannot change your answers after submitting
or exiting.

> **Important:**
> - Do not close the browser or switch tabs during the test
> - Your progress is saved automatically
> - The timer starts as soon as you click **Start Test**
> - Each access code gives you one attempt per session
> - If the timer runs out, your test is automatically submitted

---

## Guest Access

### How Access Codes Work

```
Teacher                          Student
  |                                |
  |  1. Generate access code       |
  |     (guest_a3f2b1)             |
  |                                |
  |  2. Share code with class      |
  |  ---------------------------->>|
  |                                |
  |                  3. Enter code  |
  |                     on guest    |
  |                     test page   |
  |                                |
  |                  4. System      |
  |                     looks up    |
  |                     test by     |
  |                     access code |
  |                                |
  |                  5. Auto-creates|
  |                     a session   |
  |                     for this    |
  |                     student     |
  |                                |
  |                  5a. (Optional) |
  |                     "Different  |
  |                      Code"      |
  |                     → session   |
  |                       deleted,  |
  |                       back to   |
  |                       step 3    |
  |                                |
  |                  6. Student     |
  |                     starts and  |
  |                     takes test  |
  |                                |
  |                  6a. Student    |
  |                     clicks      |
  |                     "Submit" or |
  |                     "Exit" to   |
  |                     finish test |
  |                                |
  |  7. View results in analytics  |
  |                                |
```

### Access Code vs Guest Token

The system supports two ways for guests to access tests:

| Feature | Access Code | Guest Token |
|---------|-------------|-------------|
| **Format** | `guest_a3f2b1` (short, 13 chars) | `guest_<UUID>` (long, 41 chars) |
| **Created by** | Teacher clicks **Generate** on test | Teacher calls **Generate Guest Link** API |
| **Stored on** | The test itself | Separate `guest_sessions` table |
| **Reusable** | Yes - many students, same code | No - one-time use per token |
| **Expires** | No (active while test is published) | Yes (24 hours by default) |
| **Use case** | Classroom sharing, walk-in tests | Individual invitations via link |

Both methods work on the same guest test page. The system automatically detects which format was entered and routes accordingly.
