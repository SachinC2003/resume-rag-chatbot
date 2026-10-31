import json
import re
from src.llm_client import client
from src.config import LLM_MODEL


def enhance_query(user_query: str) -> dict:

    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {
                "role": "system",
                "content": """
                You are a query enhancement assistant for a Resume RAG chatbot.

                Perform these three tasks:

                1. Rewrite the user's question clearly without changing its meaning.
                2. Identify related keywords and terms for better document retrieval.
                3. Generate 3 different search queries to retrieve relevant resume information.

                Rules:
                - Do not answer the user's question.
                - Do not invent candidate information.
                - Keep all generated queries relevant to the original question.
                - Return only valid JSON.

                Output format:
                {
                    "rewritten_query": "Clear version of the question",
                    "expanded_terms": ["term1", "term2", "term3"],
                    "search_queries": [
                        "Search query 1",
                        "Search query 2",
                        "Search query 3"
                    ]
                }
                """
            },
            {
                "role": "user",
                "content": f"User Question: {user_query}"
            }
        ],
        temperature=0.2
    )

    result = response.choices[0].message.content or ""

    # Some model responses wrap otherwise valid JSON in a Markdown code block.
    result = re.sub(r"^```(?:json)?\s*|\s*```$", "", result.strip(), flags=re.IGNORECASE)
    parsed = json.loads(result)
    if not isinstance(parsed, dict):
        raise ValueError("Query enhancement response must be a JSON object.")
    search_queries = parsed.get("search_queries")
    if not isinstance(search_queries, list) or not all(
        isinstance(item, str) and item.strip() for item in search_queries
    ):
        raise ValueError("Query enhancement response has invalid search_queries.")
    parsed["search_queries"] = [item.strip() for item in search_queries]
    return parsed
