from pydantic import BaseModel, Field, field_validator


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Enter a search query.")
        return normalized


class CandidateSearchResult(BaseModel):
    candidate_id: str
    candidate_name: str
    filename: str
    email: str | None = None
    phone: str | None = None
    experience_years: str | None = None
    relevant_context: str
    matching_explanation: str


class SearchResponse(BaseModel):
    query: str
    results: list[CandidateSearchResult]
