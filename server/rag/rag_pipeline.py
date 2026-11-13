
import chromadb
import re
from server.rag.config import (
    CHROMA_DB_PATH,
    LLM_MODEL,
    RESUME_COLLECTION_NAME,
    RESUME_PROFILE_COLLECTION_NAME,
)
from server.rag.embeddings import embedding_function
from server.rag.llm_client import client
from server.rag.rerancking import reranking

SHORTLIST_CANDIDATE_LIMIT = 12
SHORTLIST_CHUNKS_PER_CANDIDATE = 2
SHORTLIST_CONTEXT_MAX_CHARACTERS = 700
QUERY_STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "candidate", "candidates",
    "can", "completed", "demonstrate", "demonstrated", "demonstrates", "did",
    "do", "does", "experience", "explicitly", "for", "from", "has", "have",
    "i", "in", "is", "it", "list", "me", "mention", "mentioned", "mentions",
    "of", "on", "or", "person", "people", "please", "resume", "show", "shows",
    "student", "students", "that", "the", "their", "them", "they", "this", "to",
    "use", "used", "using", "was", "were", "who", "with", "work", "worked",
    "which",
}


# Resolve first names and other partial names to one indexed candidate.
def resolve_candidate_name(
    collection, candidate_name: str, where: dict | None = None
) -> str:
    normalized_query = " ".join(
        re.sub(r"[^a-z0-9 ]", " ", candidate_name.casefold()).split()
    )
    stored_names = {
        metadata["candidate_name_normalized"]: metadata["candidate_name"]
        for metadata in collection.get(
            where=where, include=["metadatas"]
        )["metadatas"]
        if metadata.get("candidate_name_normalized") and metadata.get("candidate_name")
    }

    if normalized_query in stored_names:
        return normalized_query

    query_words = set(normalized_query.split())
    matches = [
        normalized_name
        for normalized_name in stored_names
        if normalized_query in normalized_name.split()
        or normalized_name.startswith(f"{normalized_query} ")
        or query_words.issubset(set(normalized_name.split()))
    ]
    if not matches:
        raise ValueError(f"No indexed resume matches candidate {candidate_name!r}.")
    if len(matches) > 1:
        raise ValueError(
            f"Candidate name {candidate_name!r} matches multiple resumes. "
            "Please provide the candidate's full name."
        )
    return matches[0]


# Normalize common spelling and punctuation variants of the KIT institution name.
def _normalized_institution_text(text: str) -> str:
    normalized = " ".join(
        re.sub(r"[^a-z0-9]+", " ", text.casefold()).split()
    )
    return normalized.replace("kolhaput", "kolhapur")


# Recognize the institution under either its full name or college-name variant.
def _mentions_kit_institution(text: str) -> bool:
    normalized = _normalized_institution_text(text)
    return (
        "kolhapur institute of technology" in normalized
        or re.search(r"\bkit(?:s| s)? college of engineering\b", normalized) is not None
    )


# Detect KIT-focused questions so profiles with other colleges do not enter the shortlist.
def _asks_about_kit_institution(query: str) -> bool:
    normalized = _normalized_institution_text(query)
    has_full_name = (
        "institute of technology" in normalized
        and "kolhapur" in normalized
    )
    has_kit_college = (
        re.search(r"\bkit(?:s| s)? college of engineering\b", normalized) is not None
    )
    return has_full_name or has_kit_college


# Rank one profile per candidate using exact terms and semantic search rank.
def rank_candidate_profiles(
    query: str,
    profiles: dict,
    semantic_results: dict,
) -> list[dict]:
    semantic_ranks = {}
    for query_ids in semantic_results["ids"]:
        for rank, candidate_id in enumerate(query_ids):
            semantic_ranks[candidate_id] = min(
                rank, semantic_ranks.get(candidate_id, rank)
            )

    terms = {
        term
        for term in re.findall(r"[a-z0-9][a-z0-9+#./-]*", query.casefold())
        if term not in QUERY_STOP_WORDS and (len(term) > 2 or term in {"c", "c++", "c#"})
    }
    # Keep explicit acronyms such as AWS, REST, and KIT as hard shortlist criteria.
    required_acronyms = {
        term.casefold()
        for term in re.findall(r"\b[A-Z][A-Z0-9+#./-]{1,}\b", query)
    }

    ranked_profiles = []
    profile_terms_by_candidate = {}
    profile_text_by_candidate = {}
    for candidate_id, text, metadata in zip(
        profiles["ids"], profiles["documents"], profiles["metadatas"]
    ):
        profile_terms = set(
            re.findall(r"[a-z0-9][a-z0-9+#./-]*", text.casefold())
        )
        profile_terms_by_candidate[candidate_id] = profile_terms
        profile_text_by_candidate[candidate_id] = text
        matched_terms = terms & profile_terms
        lexical_coverage = len(matched_terms) / len(terms) if terms else 0.0
        ranked_profiles.append(
            {
                "candidate_id": candidate_id,
                "candidate_name": metadata["candidate_name"],
                "lexical_coverage": lexical_coverage,
                "semantic_rank": semantic_ranks.get(candidate_id, len(profiles["ids"])),
            }
        )

    ranked_profiles = sorted(
        ranked_profiles,
        key=lambda profile: (
            -profile["lexical_coverage"],
            profile["semantic_rank"],
            profile["candidate_name"].casefold(),
        ),
    )

    # Prefer resumes containing the requested terms; use semantic matches if none do.
    matching_profiles = [
        profile for profile in ranked_profiles if profile["lexical_coverage"] > 0
    ]
    acronym_matches = [
        profile
        for profile in matching_profiles
        if required_acronyms.issubset(
            profile_terms_by_candidate[profile["candidate_id"]]
        )
    ]
    if required_acronyms and acronym_matches:
        matching_profiles = acronym_matches
    if matching_profiles:
        ranked_profiles = matching_profiles
    else:
        ranked_profiles = ranked_profiles[:5]

    # Keep this institution query grounded in profiles that actually name KIT.
    if _asks_about_kit_institution(query):
        kit_profiles = [
            profile
            for profile in ranked_profiles
            if _mentions_kit_institution(
                profile_text_by_candidate[profile["candidate_id"]]
            )
        ]
        ranked_profiles = kit_profiles

    return ranked_profiles[:SHORTLIST_CANDIDATE_LIMIT]


# Retrieve and rerank evidence separately for each shortlisted candidate.
def retrieve_candidate_matches(
    collection,
    ranked_profiles: list[dict],
    query: str,
    section: str,
    metadata_filter: dict | None = None,
) -> list[dict[str, str]]:
    candidate_ids = [profile["candidate_id"] for profile in ranked_profiles]
    filters = [{"candidate_id": {"$in": candidate_ids}}]
    if metadata_filter:
        filters.append(metadata_filter)
    chunks = collection.get(
        where=filters[0] if len(filters) == 1 else {"$and": filters},
        include=["documents", "metadatas"],
    )
    chunks_by_candidate = {candidate_id: [] for candidate_id in candidate_ids}
    for document, metadata in zip(chunks["documents"], chunks["metadatas"]):
        chunks_by_candidate[metadata["candidate_id"]].append((document, metadata))

    evidence = []
    for profile in ranked_profiles:
        candidate_chunks = chunks_by_candidate[profile["candidate_id"]]
        if not candidate_chunks:
            continue

        # Prefer the classified resume section when it has evidence for this candidate.
        section_chunks = [
            (document, metadata)
            for document, metadata in candidate_chunks
            if metadata.get("section") == section
        ]
        if section != "general" and section_chunks:
            candidate_chunks = section_chunks

        reranked_documents = reranking(
            [document for document, _ in candidate_chunks], query
        )
        metadata_by_document = {
            document: metadata for document, metadata in candidate_chunks
        }
        for document in reranked_documents[:SHORTLIST_CHUNKS_PER_CANDIDATE]:
            metadata = metadata_by_document[document]
            evidence.append(
                {
                    "candidate_id": profile["candidate_id"],
                    "candidate_name": profile["candidate_name"],
                    "section": metadata.get("section", "general"),
                    "text": document,
                }
            )

    return evidence


def retrieve_candidate_evidence(
    collection,
    ranked_profiles: list[dict],
    query: str,
    section: str,
) -> list[str]:
    return [
        f"Candidate: {evidence['candidate_name']}\n"
        f"Section: {evidence['section']}\n"
        f"Resume evidence: {evidence['text']}"
        for evidence in retrieve_candidate_matches(
            collection, ranked_profiles, query, section
        )
    ]


def _matching_explanation(query: str, evidence: list[dict[str, str]]) -> str:
    query_terms = list(dict.fromkeys(
        term
        for term in re.findall(r"[a-z0-9][a-z0-9+#./-]*", query.casefold())
        if term not in QUERY_STOP_WORDS
        and (len(term) > 2 or term in {"c", "c++", "c#"})
    ))
    evidence_terms = {
        term
        for item in evidence
        for term in re.findall(r"[a-z0-9][a-z0-9+#./-]*", item["text"].casefold())
    }
    matched_terms = [term for term in query_terms if term in evidence_terms][:5]
    sections = list(dict.fromkeys(item["section"] for item in evidence))
    section_description = ", ".join(sections)

    if matched_terms:
        return (
            f"Retrieved {section_description} evidence mentions "
            f"{', '.join(matched_terms)}."
        )
    return (
        f"Cross-Encoder reranking found relevant evidence in the "
        f"{section_description} section."
    )


def retrieve_shortlisted_candidates(
    query: str,
    section: str,
    candidate_name: str | None = None,
    enhanced_query: dict | None = None,
    company_id: str | None = None,
    event_id: str | None = None,
) -> list[dict[str, str]]:
    if (company_id is None) != (event_id is None):
        raise ValueError("Both company_id and event_id are required for scoped search.")

    search_queries = (enhanced_query or {}).get("search_queries", [])
    if not search_queries:
        search_queries = [query]

    query_embeddings = embedding_function(search_queries)
    client = chromadb.PersistentClient(path=str(CHROMA_DB_PATH))
    collection = client.get_collection(name=RESUME_COLLECTION_NAME)
    profile_collection = client.get_or_create_collection(
        name=RESUME_PROFILE_COLLECTION_NAME
    )
    metadata_filter = None
    if company_id is not None and event_id is not None:
        metadata_filter = {
            "$and": [
                {"company_id": company_id},
                {"event_id": event_id},
            ]
        }
    scoped_chunks = collection.get(
        where=metadata_filter, include=["metadatas"]
    )
    scoped_chunk_count = len(scoped_chunks["ids"])
    if scoped_chunk_count == 0:
        raise RuntimeError(
            "No resumes are indexed for this event. Upload resumes before searching."
        )

    profile_data = profile_collection.get(
        where=metadata_filter, include=["metadatas"]
    )
    profiles_by_id = {
        candidate_id: metadata
        for candidate_id, metadata in zip(
            profile_data["ids"], profile_data["metadatas"]
        )
        if metadata
    }

    if candidate_name:
        normalized_name = resolve_candidate_name(
            collection, candidate_name, where=metadata_filter
        )
        profile = next(
            (
                (candidate_id, metadata)
                for candidate_id, metadata in profiles_by_id.items()
                if metadata.get("candidate_name_normalized") == normalized_name
            ),
            None,
        )
        if profile is None:
            raise ValueError(
                f"No indexed profile matches candidate {candidate_name!r}."
            )
        candidate_id, metadata = profile
        query_args = {
            "query_embeddings": query_embeddings,
            "n_results": min(10, scoped_chunk_count),
        }
        metadata_filters = [metadata_filter] if metadata_filter else []
        if section != "general":
            metadata_filters.append({"section": section})
        metadata_filters.append(
            {"candidate_name_normalized": normalized_name}
        )
        if metadata_filters:
            query_args["where"] = (
                metadata_filters[0]
                if len(metadata_filters) == 1
                else {"$and": metadata_filters}
            )
        results = collection.query(**query_args)
        if not any(results["documents"]) and section != "general":
            fallback_filters = [metadata_filter] if metadata_filter else []
            fallback_filters.append(
                {"candidate_name_normalized": normalized_name}
            )
            query_args["where"] = (
                fallback_filters[0]
                if len(fallback_filters) == 1
                else {"$and": fallback_filters}
            )
            results = collection.query(**query_args)

        candidate_chunks = []
        seen_chunks = set()
        for documents, metadatas in zip(
            results["documents"], results["metadatas"]
        ):
            for document, chunk_metadata in zip(documents, metadatas):
                if document not in seen_chunks:
                    candidate_chunks.append(
                        {
                            "candidate_id": candidate_id,
                            "candidate_name": metadata["candidate_name"],
                            "section": chunk_metadata.get("section", "general"),
                            "text": document,
                        }
                    )
                    seen_chunks.add(document)
        if candidate_chunks:
            reranked = reranking(
                [item["text"] for item in candidate_chunks], query
            )
            chunks_by_text = {item["text"]: item for item in candidate_chunks}
            evidence = [chunks_by_text[text] for text in reranked[:2]]
        else:
            evidence = []
        selected_profiles = {candidate_id: metadata}
    else:
        profile_count = len(profile_data["ids"])
        if profile_count == 0:
            raise RuntimeError(
                "Candidate profiles are not indexed for this event. "
                "Upload resumes before searching."
            )
        profiles = profile_collection.get(
            where=metadata_filter, include=["documents", "metadatas"]
        )
        profile_results = profile_collection.query(
            query_embeddings=query_embeddings,
            n_results=profile_count,
            where=metadata_filter,
        )
        ranked_profiles = rank_candidate_profiles(
            query, profiles, profile_results
        )
        evidence = retrieve_candidate_matches(
            collection, ranked_profiles, query, section, metadata_filter
        )
        selected_profiles = {
            profile["candidate_id"]: profiles_by_id[profile["candidate_id"]]
            for profile in ranked_profiles
            if profile["candidate_id"] in profiles_by_id
        }

    grouped_evidence: dict[str, list[dict[str, str]]] = {}
    for item in evidence:
        grouped_evidence.setdefault(item["candidate_id"], []).append(item)

    results = []
    for candidate_id, candidate_evidence in grouped_evidence.items():
        metadata = selected_profiles[candidate_id]
        relevant_context = "\n\n".join(
            item["text"] for item in candidate_evidence
        )
        if len(relevant_context) > SHORTLIST_CONTEXT_MAX_CHARACTERS:
            excerpt = relevant_context[:SHORTLIST_CONTEXT_MAX_CHARACTERS - 3]
            relevant_context = f"{excerpt.rsplit(' ', 1)[0] or excerpt}..."
        results.append(
            {
                "candidate_id": candidate_id,
                "candidate_name": metadata["candidate_name"],
                "filename": metadata.get("source_file", ""),
                "relevant_context": relevant_context,
                "matching_explanation": _matching_explanation(
                    query, candidate_evidence
                ),
            }
        )
    return results


def generate_answer(query: str, context: str) -> str:
    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful resume assistant. "
                    "Answer using only the provided resume context. "
                    "When context contains multiple candidates, identify them by name. "
                    "For questions asking who, list each matching candidate in context. "
                    "For shortlisting, only recommend candidates whose resume evidence "
                    "supports the requirement. Distinguish listed skills from demonstrated "
                    "work or project experience, and do not claim that a degree is complete "
                    "unless the resume explicitly confirms completion. The shortlist may "
                    "be capped; do not imply it is exhaustive unless the context supports that. "
                    "For education questions, list each candidate whose education evidence "
                    "names the requested institution. If asked whether a degree was completed, "
                    "state when the resume only gives a degree and date range without confirming "
                    "completion. "
                    "If the answer is missing, say you cannot find "
                    "the information in the resume. Do not invent details."
                ),
            },
            {
                "role": "user",
                "content": f"Resume context:\n{context}\n\nQuestion: {query}",
            },
        ],
        temperature=0.2,
    )

    return response.choices[0].message.content or ""


def run_rag_pipeline(
        query: str,
        section: str,
        candidate_name: str | None = None,
        enhanced_query: dict | None = None
) -> str:
    """Retrieve relevant resume chunks and generate an answer."""

    # 1. Create an embedding for the user's question
    search_queries = (enhanced_query or {}).get("search_queries", [])
    if not search_queries:
        search_queries = [query]

    query_embedding = embedding_function(search_queries)

    # 2. Connect to ChromaDB
    client = chromadb.PersistentClient(path=str(CHROMA_DB_PATH))
    collection = client.get_collection(name=RESUME_COLLECTION_NAME)
    profile_collection = client.get_or_create_collection(
        name=RESUME_PROFILE_COLLECTION_NAME
    )

    result_count = collection.count()
    if result_count == 0:
        raise RuntimeError("The resume collection is empty. Run the application to index the PDF first.")



    # Search all candidate profiles first for questions that do not name a candidate.
    if not candidate_name:
        profile_count = profile_collection.count()
        if profile_count == 0:
            raise RuntimeError(
                "Candidate profiles are not indexed. Re-run the application to "
                "index resumes before asking shortlist questions."
            )

        profiles = profile_collection.get(include=["documents", "metadatas"])
        profile_results = profile_collection.query(
            query_embeddings=query_embedding,
            n_results=profile_count,
        )
        ranked_profiles = rank_candidate_profiles(query, profiles, profile_results)
        documents = retrieve_candidate_evidence(
            collection, ranked_profiles, query, section
        )
        if not documents:
            raise RuntimeError("No resume evidence was returned for the question.")
        return generate_answer(query, "\n\n".join(documents))

    # Retrieve relevant chunks directly when a specific candidate is named.
    query_args = {
        "query_embeddings": query_embedding,
        "n_results": min(10, result_count)
    }

    metadata_filters = []
    if section != "general":
        metadata_filters.append({"section": section})
    if candidate_name:
        # Match a partial user-provided name against the full indexed candidate name.
        candidate_name = resolve_candidate_name(collection, candidate_name)
        metadata_filters.append(
            {"candidate_name_normalized": candidate_name}
        )
    if len(metadata_filters) == 1:
        query_args["where"] = metadata_filters[0]
    elif metadata_filters:
        query_args["where"] = {"$and": metadata_filters}

    results = collection.query(**query_args)
    if metadata_filters and not any(results["documents"]):
        # Keep a candidate filter when relaxing a section filter to avoid mixing resumes.
        if candidate_name and section != "general":
            query_args["where"] = {"candidate_name_normalized": candidate_name}
            results = collection.query(**query_args)
        elif not candidate_name:
            query_args.pop("where")
            results = collection.query(**query_args)

    # Include candidate names in the answer context and keep identical chunks per candidate.
    documents = []
    seen_chunks = set()
    for query_documents, query_metadatas in zip(
        results["documents"], results["metadatas"]
    ):
        for doc, metadata in zip(query_documents, query_metadatas):
            candidate = metadata.get("candidate_name", "Unknown candidate")
            chunk_key = (metadata.get("candidate_id"), doc)
            if chunk_key not in seen_chunks:
                documents.append(
                    f"Candidate: {candidate}\n"
                    f"Section: {metadata.get('section', 'general')}\n"
                    f"Resume content: {doc}"
                )
                seen_chunks.add(chunk_key)

    # Reranking the chunks according to relevance
    reranked_chunks = reranking(documents, query)

    # Limit the total retrieved chunks.
    documents = reranked_chunks[0:5]
    if not documents:
        raise RuntimeError("No resume content was returned for the question.")
    context = "\n\n".join(documents)

    # 5. Generate the final answer using Groq
    answer = generate_answer(query, context)

    return answer
