from pydantic import BaseModel

class ResumeMetadata(BaseModel):
    candidate_id: str
    candidate_name: str
    source_file: str
    company_id: str = "local"
    event_id: str = "local"