from src.config import PDF_PATH
from src.document_loader import load_document
from src.embeddings import embedding_function
from src.chunking import split_document
from src.vector_store import store_embeddings_in_vector_db
from src.rag_pipeline import run_rag_pipeline
from src.query_enhancement import enhance_query

def main():
    # Load the document
    document_text = load_document(PDF_PATH)

    # split the PDF
    chunks = split_document(document_text)
    if not chunks:
        raise ValueError("The PDF did not produce any text chunks to index.")

    # Create embeddings for the chunks
    embeddings = embedding_function(chunks)

    # Store the embeddings in a vector DB
    store_embeddings_in_vector_db(chunks, embeddings)

    print("\nRAG pipeline is ready. You can now ask questions about the document.")
    print("Type 'exit' to quit the program.")

    # Keep asking questions until the user types 'exit'.
    while True:
        query = input("You: ").strip()

        if query.lower() in ["exit", "quit"]:
            print("Exiting the program. Goodbye!")
            break

        if not query:
            print("Please enter a valid question.")
            continue

        print("Processing your question...")
        print("\nUserQuery: ", query)

        try:
            enhanced_query = enhance_query(query)
        except Exception:
            enhanced_query = {
                "search_queries": [query]
            }

        result = run_rag_pipeline(query, enhanced_query)

        print("\nFINAL ANSWER:")
        print(result)
        print("\n" + "=" * 60 + "\n")


if __name__ == "__main__":
    main()
