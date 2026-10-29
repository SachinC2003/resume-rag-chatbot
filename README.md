# Resume RAG Chatbot

A **Retrieval-Augmented Generation (RAG)** chatbot built with Python that answers questions about a resume by retrieving relevant information from a PDF and generating context-grounded responses using an LLM.

## Features

- **PDF Document Loading:** Extracts text from a resume PDF.
- **Text Chunking:** Splits extracted text into smaller, overlapping chunks.
- **Text Embeddings:** Converts chunks and user queries into vector representations using Sentence Transformers.
- **Vector Database:** Stores and retrieves document chunks using ChromaDB.
- **Semantic Search:** Retrieves relevant resume information based on the user's query.
- **LLM Integration:** Uses the Groq API to generate answers from retrieved context.
- **Context-Grounded Responses:** Instructs the LLM to answer using the resume context and acknowledge when information is unavailable.
- **Interactive CLI:** Allows users to ask multiple questions in a terminal session.

## Tech Stack

- **Language:** Python
- **Embeddings:** Sentence Transformers (`all-MiniLM-L6-v2`)
- **Vector Database:** ChromaDB
- **LLM API:** Groq
- **PDF Processing:** PyMuPDF
- **Environment Variables:** python-dotenv
- **Package Management:** uv

## How It Works

The application follows a basic RAG pipeline with two stages.

### 1. Document Ingestion

1. Load the resume PDF.
2. Extract text from the document.
3. Split the extracted text into chunks with overlap.
4. Generate embeddings for each chunk.
5. Store the chunks and their embeddings in ChromaDB.

### 2. Question Answering

1. Accept a question from the user.
2. Generate an embedding for the question.
3. Retrieve the most relevant chunks from ChromaDB.
4. Combine the retrieved chunks into a context.
5. Send the context and question to the Groq LLM.
6. Display the generated answer in the terminal.

## Project Structure

```text
resume-rag-chatbot/
├── data/
│   └── Sachin_Chougule_Resume.pdf
├── src/
│   ├── document_loader.py
│   ├── chunking.py
│   ├── embeddings.py
│   ├── config.py
│   └── rag_pipeline.py
├── chroma_db/
├── main.py
├── .env
├── .gitignore
├── pyproject.toml
├── uv.lock
└── README.md
```

*Note: The structure above reflects the current project setup; adjust filenames if your repository differs.*

## Prerequisites

- Python version supported by your project dependencies
- [uv](https://docs.astral.sh/uv/)
- A Groq API key

## Setup and Installation

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/resume-rag-chatbot.git
cd resume-rag-chatbot
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Create a Virtual Environment

```bash
uv sync
```

If you haven't configured all dependencies in `pyproject.toml` yet, install the required packages using your project's dependency setup.

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
```

Replace the placeholder with your own API key. **Never commit your `.env` file or expose your API key.**

### 4. Add the Resume PDF

Place your PDF resume in the `data/` directory and ensure the file path in your code matches its location.

### 5. Run the Application

From the project root, run:

```bash
python main.py
```

The application ingests the resume, initializes the RAG pipeline, and allows you to ask questions interactively.

Type `exit` to stop the program.

## Example Questions

- What is the candidate's current job role?
- What projects are listed in the resume?
- What technologies were used in the MediGuard project?
- What measurable achievements are mentioned in the resume?
- What is the candidate's LinkedIn profile?
- What experience does the candidate have with Node.js?

## Example Output

```text
RAG pipeline is ready. You can now ask questions about the document.
Type 'exit' to quit the program.

You: List all projects in the resume.

FINAL ANSWER:
1. Attendii – Event Attendance System
2. MediGuard – Privacy-Preserving Medical Diagnosis
```

*Output is illustrative; actual responses depend on the document, retrieved chunks, and LLM.*

## Key Concepts Learned

- Retrieval-Augmented Generation (RAG)
- PDF text extraction
- Text chunking and overlap
- Text embeddings
- Vector databases
- Semantic similarity search
- Retrieval Top-K configuration
- Context construction and prompt engineering
- LLM API integration
- Environment variable management

## Current Limitations

- Retrieval quality depends on chunking and the number of retrieved chunks.
- PDF extraction quality may vary depending on document formatting.
- The chatbot can omit information when relevant chunks are not retrieved.
- Answers depend on the supplied resume context and the LLM's response.
- The current application is a command-line prototype and does not include a web interface.

## Future Improvements

- Implement section-aware chunking.
- Experiment with chunk size, overlap, and Top-K settings.
- Add similarity-score inspection and retrieval evaluation.
- Implement hybrid search and reranking.
- Add support for uploading and querying different documents.
- Build a FastAPI backend and web interface.
- Dockerize and deploy the application.

## Learning Purpose

This project was developed as a hands-on learning project to understand the fundamentals of Retrieval-Augmented Generation and build a working RAG pipeline from scratch using Python and modern AI tools.

## License

Choose a license before distributing the project publicly. If you select the MIT License, add a corresponding `LICENSE` file to the repository.
