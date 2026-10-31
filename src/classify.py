from src.llm_client import client
from src.config import LLM_MODEL


def classify_query_or_chunk(text: str) -> str:
    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {
                "role": "system",
                "content": """
                Classify the provided resume text or question into exactly one
                category: skills, projects, experience, education, or general.

                For resume text, choose the category that best describes its
                content. For questions, choose the category being asked about.
                Use general when no other category fits.
                Return only the lowercase category name.
                """
            },
            {
                "role": "user",
                "content": text
            }
        ],
        temperature=0.2
    )

    return (response.choices[0].message.content or "").strip().lower()