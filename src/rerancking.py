from sentence_transformers import CrossEncoder

model = CrossEncoder("ms-marco-MiniLM-L-6-v2")


def reranking(chunks: list[str], user_query: str) -> list[str]:
    pairs = [[user_query, doc] for doc in chunks]

    scores = model.predict(pairs)

    reranked_results = sorted(zip(chunks, scores), key=lambda item: item[1], reverse=True)

    for doc, score in reranked_results:
        print(f"Score: {score:.4f} | Doc: {doc}")

    return [doc for doc, _ in reranked_results]