from pydantic import BaseModel


class ResumeCandidate(BaseModel):
    candidate_id: str
    candidate_name: str
    filename: str
    status: str


class ResumeListResponse(BaseModel):
    resumes: list[ResumeCandidate]


class ResumeUploadResult(ResumeCandidate):
    pass


class ResumeUploadResponse(BaseModel):
    results: list[ResumeUploadResult]
