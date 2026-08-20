import os
import time
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from app import run_agent_with_trace, MODEL
from tools import get_tools_info, AVAILABLE_FUNCTIONS, TOOL_DECLARATIONS
from google.genai import types

load_dotenv()

app = FastAPI(
    title="Gemini Tool-Calling Agent API",
    description="Backend server for Gemini 3.6 Flash Tool-Calling Web UI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    api_key: Optional[str] = None


class ToolExecutionRequest(BaseModel):
    name: str
    arguments: Dict[str, Any]


class RegisterToolRequest(BaseModel):
    name: str
    description: str
    formula: str  # e.g., "a ** 3 + b" or "n * 10"
    params: List[str]  # e.g., ["a", "b"] or ["n"]


@app.get("/api/health")
def health_check():
    api_key_set = bool(os.environ.get("GEMINI_API_KEY"))
    return {
        "status": "online",
        "model": MODEL,
        "api_key_configured": api_key_set,
        "available_tools_count": len(AVAILABLE_FUNCTIONS),
    }


@app.get("/api/tools")
def list_tools():
    """Return catalog of registered tools and schemas."""
    return {
        "tools": get_tools_info(),
        "total": len(AVAILABLE_FUNCTIONS),
    }


@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    """Execute Gemini tool calling workflow with request trace telemetry."""
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        result = run_agent_with_trace(req.message.strip(), custom_api_key=req.api_key)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tools/execute")
def execute_tool_endpoint(req: ToolExecutionRequest):
    """Directly test execution of a specific python tool."""
    func = AVAILABLE_FUNCTIONS.get(req.name)
    if not func:
        raise HTTPException(status_code=444, detail=f"Tool '{req.name}' not found")

    start = time.time()
    try:
        res = func(**req.arguments)
        elapsed = round((time.time() - start) * 1000, 2)
        return {
            "name": req.name,
            "arguments": req.arguments,
            "result": res,
            "status": "success",
            "execution_time_ms": elapsed,
        }
    except Exception as e:
        elapsed = round((time.time() - start) * 1000, 2)
        return {
            "name": req.name,
            "arguments": req.arguments,
            "error": str(e),
            "status": "error",
            "execution_time_ms": elapsed,
        }


@app.post("/api/tools/register")
def register_tool_endpoint(req: RegisterToolRequest):
    """Dynamically register a new custom math tool."""
    tool_name = req.name.strip().lower()
    if tool_name in AVAILABLE_FUNCTIONS:
        raise HTTPException(status_code=400, detail=f"Tool '{tool_name}' already exists.")

    # Safely evaluate mathematical expression
    try:
        param_str = ", ".join(req.params)
        code_str = f"def {tool_name}({param_str}): return {req.formula}"
        local_scope = {}
        exec(code_str, {"__builtins__": None, "abs": abs, "pow": pow, "round": round, "min": min, "max": max}, local_scope)
        new_func = local_scope[tool_name]

        # Add to available functions
        AVAILABLE_FUNCTIONS[tool_name] = new_func

        # Build schema
        props = {p: types.Schema(type=types.Type.NUMBER) for p in req.params}
        new_schema = types.Schema(
            type=types.Type.OBJECT,
            properties=props,
            required=req.params,
        )

        decl = types.FunctionDeclaration(
            name=tool_name,
            description=req.description,
            parameters=new_schema,
        )
        TOOL_DECLARATIONS.append(decl)

        return {
            "status": "registered",
            "name": tool_name,
            "description": req.description,
            "parameters": req.params,
            "tools_count": len(AVAILABLE_FUNCTIONS),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to register custom tool: {str(e)}")


# Serve static web files
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 Starting Gemini Tool Agent Web Server on http://0.0.0.0:{port} ...")
    uvicorn.run("server:app", host="0.0.0.0", port=port)

