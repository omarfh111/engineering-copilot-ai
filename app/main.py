from fastapi import FastAPI

app = FastAPI(title="Engineering Copilot AI")

@app.get("/")
def root():
    return {"message": "Engineering Copilot AI is running"}