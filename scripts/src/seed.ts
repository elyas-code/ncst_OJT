import { db } from "@workspace/db";
import {
  usersTable,
  coursesTable,
  enrollmentsTable,
  modulesTable,
  filesTable,
  quizzesTable,
  questionsTable,
  announcementsTable,
} from "@workspace/db";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Seeding database...");

  const hash = (p: string) => bcrypt.hash(p, 10);

  // Users
  const [admin] = await db.insert(usersTable).values({
    name: "Dr. Khalid Al-Rashidi",
    email: "admin@ncst.edu.bh",
    passwordHash: await hash("password123"),
    role: "admin",
    department: "Administration",
  }).onConflictDoNothing().returning();

  const [teacher1] = await db.insert(usersTable).values({
    name: "Dr. Aisha Mohammed",
    email: "teacher@example.com",
    passwordHash: await hash("password123"),
    role: "teacher",
    department: "Computer Science",
  }).onConflictDoNothing().returning();

  const [teacher2] = await db.insert(usersTable).values({
    name: "Prof. Yusuf Al-Mansoori",
    email: "teacher2@example.com",
    passwordHash: await hash("password123"),
    role: "teacher",
    department: "Mathematics",
  }).onConflictDoNothing().returning();

  const [student1] = await db.insert(usersTable).values({
    name: "Fatima Al-Zahra",
    email: "student@example.com",
    passwordHash: await hash("password123"),
    role: "student",
    studentId: "2021-CS-001",
    department: "Computer Science",
  }).onConflictDoNothing().returning();

  const [student2] = await db.insert(usersTable).values({
    name: "Omar Al-Khalifa",
    email: "student2@example.com",
    passwordHash: await hash("password123"),
    role: "student",
    studentId: "2021-CS-002",
    department: "Computer Science",
  }).onConflictDoNothing().returning();

  const [student3] = await db.insert(usersTable).values({
    name: "Mariam Al-Hassan",
    email: "student3@example.com",
    passwordHash: await hash("password123"),
    role: "student",
    studentId: "2021-CS-003",
    department: "Computer Science",
  }).onConflictDoNothing().returning();

  const teacherId1 = teacher1?.id;
  const teacherId2 = teacher2?.id;
  const studentId1 = student1?.id;
  const studentId2 = student2?.id;
  const studentId3 = student3?.id;

  if (!teacherId1 || !teacherId2 || !studentId1 || !studentId2 || !studentId3) {
    console.log("Users already seeded, skipping.");
    return;
  }

  // Courses
  const [course1] = await db.insert(coursesTable).values({
    title: "Introduction to Computer Science",
    code: "CS101",
    description: "Foundational course covering programming paradigms, algorithms, and computational thinking.",
    teacherId: teacherId1,
    semester: "Spring",
    academicYear: "2025-2026",
  }).returning();

  const [course2] = await db.insert(coursesTable).values({
    title: "Data Structures and Algorithms",
    code: "CS201",
    description: "Advanced study of data structures, algorithm design, and complexity analysis.",
    teacherId: teacherId1,
    semester: "Spring",
    academicYear: "2025-2026",
  }).returning();

  const [course3] = await db.insert(coursesTable).values({
    title: "Calculus I",
    code: "MATH101",
    description: "Differential and integral calculus with applications in science and engineering.",
    teacherId: teacherId2,
    semester: "Spring",
    academicYear: "2025-2026",
  }).returning();

  // Enrollments
  await db.insert(enrollmentsTable).values([
    { courseId: course1.id, studentId: studentId1 },
    { courseId: course1.id, studentId: studentId2 },
    { courseId: course1.id, studentId: studentId3 },
    { courseId: course2.id, studentId: studentId1 },
    { courseId: course2.id, studentId: studentId2 },
    { courseId: course3.id, studentId: studentId1 },
    { courseId: course3.id, studentId: studentId3 },
  ]);

  // Modules for CS101
  const [mod1] = await db.insert(modulesTable).values({ courseId: course1.id, title: "Week 1: Introduction to Programming", description: "Getting started with Python and basic programming concepts.", position: 0 }).returning();
  const [mod2] = await db.insert(modulesTable).values({ courseId: course1.id, title: "Week 2: Control Flow", description: "Conditionals, loops, and flow control in Python.", position: 1 }).returning();
  const [mod3] = await db.insert(modulesTable).values({ courseId: course1.id, title: "Week 3: Functions and Modules", description: "Defining functions, scope, and importing modules.", position: 2 }).returning();

  // Modules for CS201
  const [mod4] = await db.insert(modulesTable).values({ courseId: course2.id, title: "Week 1: Arrays and Lists", description: "Static and dynamic arrays, linked lists.", position: 0 }).returning();
  const [mod5] = await db.insert(modulesTable).values({ courseId: course2.id, title: "Week 2: Stacks and Queues", description: "LIFO, FIFO data structures and applications.", position: 1 }).returning();

  // Files
  await db.insert(filesTable).values([
    { moduleId: mod1.id, fileName: "lecture1_intro.pdf", originalName: "Lecture 1 - Introduction.pdf", fileType: "pdf", fileSize: 2048000, url: "/api/files/lecture1_intro.pdf", uploadedBy: teacherId1 },
    { moduleId: mod1.id, fileName: "python_setup.pdf", originalName: "Python Setup Guide.pdf", fileType: "pdf", fileSize: 512000, url: "/api/files/python_setup.pdf", uploadedBy: teacherId1 },
    { moduleId: mod2.id, fileName: "control_flow_slides.pptx", originalName: "Control Flow - Slides.pptx", fileType: "pptx", fileSize: 4096000, url: "/api/files/control_flow_slides.pptx", uploadedBy: teacherId1 },
    { moduleId: mod2.id, fileName: "exercises_w2.docx", originalName: "Week 2 Exercises.docx", fileType: "docx", fileSize: 256000, url: "/api/files/exercises_w2.docx", uploadedBy: teacherId1 },
    { moduleId: mod3.id, fileName: "functions_notes.pdf", originalName: "Functions and Modules - Notes.pdf", fileType: "pdf", fileSize: 1024000, url: "/api/files/functions_notes.pdf", uploadedBy: teacherId1 },
    { moduleId: mod4.id, fileName: "arrays_lecture.pdf", originalName: "Arrays and Lists - Lecture.pdf", fileType: "pdf", fileSize: 3145728, url: "/api/files/arrays_lecture.pdf", uploadedBy: teacherId1 },
    { moduleId: mod5.id, fileName: "stacks_queues.pdf", originalName: "Stacks and Queues.pdf", fileType: "pdf", fileSize: 1572864, url: "/api/files/stacks_queues.pdf", uploadedBy: teacherId1 },
  ]);

  // Announcements
  await db.insert(announcementsTable).values([
    {
      courseId: course1.id,
      title: "Welcome to CS101 — Spring 2026",
      content: "Welcome to Introduction to Computer Science. Please review the syllabus and ensure you have Python 3.12 installed before our first session. Office hours are Sundays and Tuesdays 2–4pm.",
      authorId: teacherId1,
    },
    {
      courseId: course1.id,
      title: "Midterm Exam Scheduled for Week 7",
      content: "The midterm exam will be held during regular class hours in Week 7. It will cover all material from Weeks 1–6. A practice quiz will be made available one week prior.",
      authorId: teacherId1,
    },
    {
      courseId: course2.id,
      title: "Assignment 1 Due Friday",
      content: "Assignment 1 (Linked List Implementation) is due this Friday at 11:59 PM. Submit through the LMS portal. Late submissions will incur a 10% penalty per day.",
      authorId: teacherId1,
    },
  ]);

  // Quizzes
  const [quiz1] = await db.insert(quizzesTable).values({
    courseId: course1.id,
    title: "Week 1 Quiz: Python Basics",
    description: "Short quiz covering basic Python syntax and programming fundamentals.",
    quizType: "quiz",
    isPublished: true,
    durationMinutes: 20,
    maxAttempts: 2,
  }).returning();

  const [quiz2] = await db.insert(quizzesTable).values({
    courseId: course1.id,
    title: "Midterm Exam",
    description: "Comprehensive midterm examination. Lockdown mode enabled. Camera and microphone monitoring active.",
    quizType: "exam",
    isLockdown: true,
    lockdownCamera: true,
    lockdownMic: true,
    isPublished: true,
    durationMinutes: 90,
    maxAttempts: 1,
    startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
  }).returning();

  // Questions for quiz1
  await db.insert(questionsTable).values([
    {
      quizId: quiz1.id,
      questionText: "What is the correct syntax to print 'Hello, World!' in Python?",
      questionType: "multiple_choice",
      points: 2,
      position: 0,
      options: JSON.stringify(["print('Hello, World!')", "echo('Hello, World!')", "console.log('Hello, World!')", "printf('Hello, World!')"]),
      correctAnswer: "print('Hello, World!')",
      explanation: "Python uses the print() function to output text to the console.",
    },
    {
      quizId: quiz1.id,
      questionText: "Python is a compiled language.",
      questionType: "true_false",
      points: 1,
      position: 1,
      correctAnswer: "False",
      explanation: "Python is an interpreted language, not compiled. It uses a Python interpreter to execute code line by line.",
    },
    {
      quizId: quiz1.id,
      questionText: "Which of the following is a valid Python variable name?",
      questionType: "multiple_choice",
      points: 2,
      position: 2,
      options: JSON.stringify(["2ndVariable", "_my_variable", "my-variable", "class"]),
      correctAnswer: "_my_variable",
      explanation: "Variable names must start with a letter or underscore, and cannot be Python keywords like 'class'.",
    },
    {
      quizId: quiz1.id,
      questionText: "Explain the difference between a list and a tuple in Python.",
      questionType: "short_answer",
      points: 3,
      position: 3,
      explanation: "Lists are mutable (can be changed) while tuples are immutable (cannot be changed after creation). Lists use [], tuples use ().",
    },
  ]);

  // Questions for quiz2 (midterm)
  await db.insert(questionsTable).values([
    {
      quizId: quiz2.id,
      questionText: "What is the time complexity of binary search?",
      questionType: "multiple_choice",
      points: 3,
      position: 0,
      options: JSON.stringify(["O(n)", "O(log n)", "O(n²)", "O(1)"]),
      correctAnswer: "O(log n)",
      explanation: "Binary search halves the search space with each step, giving O(log n) complexity.",
    },
    {
      quizId: quiz2.id,
      questionText: "In Python, all variables are objects.",
      questionType: "true_false",
      points: 2,
      position: 1,
      correctAnswer: "True",
      explanation: "In Python, everything is an object, including integers, strings, and functions.",
    },
    {
      quizId: quiz2.id,
      questionText: "Write a Python function that returns the Fibonacci sequence up to n terms.",
      questionType: "essay",
      points: 10,
      position: 2,
      explanation: "Expected a working Python function using iteration or recursion.",
    },
  ]);

  console.log("Database seeded successfully!");
  console.log("Login credentials:");
  console.log("  Admin:   admin@ncst.edu.bh / password123");
  console.log("  Teacher: teacher@example.com / password123");
  console.log("  Student: student@example.com / password123");
}

seed().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
