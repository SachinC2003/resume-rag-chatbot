import json
import re
from server.rag.llm_client import client
from server.rag.config import LLM_MODEL

RESUME_SECTIONS = {"skills", "projects", "experience", "education", "general"}


# Use question keywords when the model does not return parseable JSON.
def _fallback_query_analysis(query: str) -> dict[str, str | None]:
    normalized_query = query.casefold()
    section_keywords = {
        "skills": ("skill", "technology", "technologies", "programming language"),
        "projects": ("project",),
        "experience": ("experience", "job", "work", "internship"),
        "education": (
            "education", "degree", "graduation", "graduate", "college",
            "university", "school", "studied",
        ),
    }

    section = "general"
    for candidate_section, keywords in section_keywords.items():
        if any(keyword in normalized_query for keyword in keywords):
            section = candidate_section
            break

    print(
        "Warning: query analyzer returned invalid JSON; "
        f"using keyword-based section '{section}' and searching all candidates."
    )
    return {"section": section, "candidate_name": None}


def classify_resume_section(text: str) -> str:
    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "Classify the provided resume text into exactly one category: "
                    "skills, projects, experience, education, or general. "
                    "Return only the lowercase category name."
                ),
            },
            {"role": "user", "content": text},
        ],
        temperature=0.2,
    )

    section = (response.choices[0].message.content or "").strip().lower()
    if section not in RESUME_SECTIONS:
        print(
            f"Warning: resume section classifier returned {section!r}; "
            "storing this chunk as general."
        )
        return "general"
    return section


def analyze_user_query(query: str) -> dict[str, str | None]:

    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {
                "role": "system",
                "content": """
                Analyze the recruiter's question.

                Return valid JSON with these fields:

                {
                    "section": "skills | projects | experience | education | general",
                    "candidate_name": "candidate name or null"
                }

                Rules:
                - Identify the resume section being asked about.
                - Extract the candidate's name only if explicitly mentioned.
                - If no candidate is mentioned, return null.
                - Do not invent candidate names.
                - Return only valid JSON.
                """
            },
            {
                "role": "user",
                "content": query
            }
        ],
        temperature=0.2
    )

    result = (response.choices[0].message.content or "").strip()
    if result.startswith("```"):
        result = re.sub(r"^```(?:json)?\s*|\s*```$", "", result, flags=re.IGNORECASE)

    try:
        parsed = json.loads(result)
    except json.JSONDecodeError:
        # Some model responses include explanatory text around an otherwise valid object.
        parsed = None
        decoder = json.JSONDecoder()
        for index, character in enumerate(result):
            if character == "{":
                try:
                    parsed, _ = decoder.raw_decode(result[index:])
                    break
                except json.JSONDecodeError:
                    continue
        if parsed is None:
            return _fallback_query_analysis(query)

    if not isinstance(parsed, dict):
        raise ValueError("Query analysis response must be a JSON object.")

    section = parsed.get("section")
    candidate_name = parsed.get("candidate_name")
    if section not in RESUME_SECTIONS:
        raise ValueError(f"Invalid section returned by query analyzer: {section!r}")
    if candidate_name is not None and (
        not isinstance(candidate_name, str) or not candidate_name.strip()
    ):
        raise ValueError("Query analyzer returned an invalid candidate name.")

    return {
        "section": section,
        "candidate_name": candidate_name.strip() if candidate_name else None,
    }