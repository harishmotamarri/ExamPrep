# ExamPrep AI

> AI-powered exam preparation platform that automatically generates assessments from study materials such as PDFs, notes, and images.

## Overview

ExamPrep AI is an intelligent assessment generation platform designed to help students and educators create practice tests from study materials automatically.

The application accepts PDFs, images, and text documents, extracts meaningful content using OCR and NLP techniques, and generates various question formats such as:

- Multiple Choice Questions (MCQs)
- Fill-in-the-Blanks
- One-Word Answer Questions

The goal is to reduce manual effort in creating assessments while improving learning efficiency.

---

## Features

- Upload PDFs, images, and text documents
- OCR support for scanned notes and images
- Automatic content extraction
- AI-powered question generation
- Multiple question formats
- Fast and scalable REST API
- Structured assessment generation
- Persistent data storage
- Extensible architecture for future enhancements

---

## Architecture

```text
+----------------+
|     Client     |
+----------------+
         |
         v
+----------------+
|   FastAPI API  |
+----------------+
         |
         v
+----------------+
| File Processor |
+----------------+
         |
         v
+----------------+
| OCR / Extract  |
+----------------+
         |
         v
+----------------+
| NLP Processing |
+----------------+
         |
         v
+--------------------+
| Question Generator |
+--------------------+
         |
         v
+----------------+
|   Database     |
+----------------+
```

---

## Tech Stack

### Backend

- Python
- FastAPI
- Uvicorn

### AI & NLP

- Natural Language Processing (NLP)
- OCR Engine

### Database

- SQLite

### Development Tools

- Git
- GitHub

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/harishmotamarri/examprep.git
cd examprep
```

### Create Virtual Environment

```bash
python -m venv venv
```

### Activate Virtual Environment

Linux / macOS:

```bash
source venv/bin/activate
```

Windows:

```bash
venv\Scripts\activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Configuration

Create a `.env` file in the root directory.

```env
DATABASE_URL=sqlite:///examprep.db
UPLOAD_DIRECTORY=uploads
```

---

## Usage

Run the application:

```bash
uvicorn main:app --reload
```

Application URL:

```text
http://localhost:8000
```

Swagger Documentation:

```text
http://localhost:8000/docs
```

---

## API Reference

### Upload Study Material

```http
POST /upload
```

#### Request

```multipart
file=<pdf/image/text>
```

#### Response

```json
{
  "file_id": "12345",
  "status": "uploaded"
}
```

---

### Generate Assessment

```http
POST /generate-test
```

#### Response

```json
{
  "test_id": "abc123",
  "questions": [
    {
      "type": "MCQ",
      "question": "What is Photosynthesis?",
      "options": [
        "A",
        "B",
        "C",
        "D"
      ],
      "answer": "B"
    }
  ]
}
```

---

### Retrieve Test

```http
GET /tests/{test_id}
```

---

## Project Structure

```text
examprep-ai/
│
├── app/
│   ├── api/
│   ├── services/
│   ├── models/
│   ├── schemas/
│   └── utils/
│
├── uploads/
├── generated_tests/
├── database/
├── tests/
│
├── requirements.txt
├── README.md
├── .env.example
└── main.py
```

---

## Workflow

1. User uploads study material.
2. System extracts text from uploaded files.
3. OCR processes image-based content.
4. NLP analyzes extracted content.
5. Question generation engine creates assessments.
6. Generated questions are stored and returned to the user.

---

## Future Enhancements

- User authentication and authorization
- Subject-specific question generation
- Difficulty levels (Easy, Medium, Hard)
- Adaptive learning system
- Student performance analytics
- PDF export functionality
- Multi-language support
- AI-powered answer explanations
- Online mock examination mode

---

## Contributing

Contributions are welcome.

### Steps

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/new-feature
```

3. Commit changes

```bash
git commit -m "Add new feature"
```

4. Push changes

```bash
git push origin feature/new-feature
```

5. Open a Pull Request

---


## Author

**Harish Motamarri**

An AI-powered educational technology project focused on automated assessment generation and intelligent learning support.
