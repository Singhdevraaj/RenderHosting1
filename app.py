import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

from tools import TOOL_DECLARATIONS, AVAILABLE_FUNCTIONS

load_dotenv()

MODEL = "gemini-3.6-flash"

api_key_env = os.environ.get("GEMINI_API_KEY", "")
client = genai.Client(api_key=api_key_env) if api_key_env else None



def run_agent_with_trace(user_message: str, custom_api_key: str = None) -> dict:
    """Send user message to Gemini, execute tools, and return structured trace metrics."""
    import time

    api_key = custom_api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is missing. Please set it in .env or settings.")

    local_client = genai.Client(api_key=api_key)

    config = types.GenerateContentConfig(
        tools=[types.Tool(function_declarations=TOOL_DECLARATIONS)]
    )

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=user_message)],
        )
    ]

    start_time = time.time()
    trace_steps = [
        {
            "step": 1,
            "type": "user_input",
            "message": user_message,
            "timestamp": time.strftime("%H:%M:%S")
        }
    ]

    response = local_client.models.generate_content(
        model=MODEL,
        contents=contents,
        config=config,
    )

    executed_tools = []

    # If Gemini answers directly without tool calling
    if not response.function_calls:
        elapsed = time.time() - start_time
        trace_steps.append({
            "step": 2,
            "type": "direct_llm_response",
            "message": response.text
        })
        return {
            "answer": response.text,
            "tool_calls": [],
            "trace": trace_steps,
            "total_time_ms": round(elapsed * 1000, 2),
            "model": MODEL
        }

    # Gemini decided to invoke tool(s)
    contents.append(response.candidates[0].content)

    for function_call in response.function_calls:
        function_name = function_call.name
        arguments = function_call.args or {}
        tool_start = time.time()

        print(f"[tool] {function_name}({arguments})")
        function_to_call = AVAILABLE_FUNCTIONS.get(function_name)

        if function_to_call is None:
            err_msg = f"Unknown tool requested by Gemini: {function_name}"
            executed_tools.append({
                "name": function_name,
                "arguments": arguments,
                "result": {"error": err_msg},
                "status": "error",
                "execution_time_ms": 0.0
            })
            continue

        try:
            result = function_to_call(**arguments)
            status = "success"
        except Exception as exc:
            result = {"error": str(exc)}
            status = "error"

        tool_elapsed = round((time.time() - tool_start) * 1000, 2)
        print(f"[result] {result} ({tool_elapsed}ms)")

        executed_tools.append({
            "name": function_name,
            "arguments": arguments,
            "result": result,
            "status": status,
            "execution_time_ms": tool_elapsed
        })

        trace_steps.append({
            "step": len(trace_steps) + 1,
            "type": "tool_execution",
            "tool_name": function_name,
            "arguments": arguments,
            "result": result,
            "duration_ms": tool_elapsed,
            "timestamp": time.strftime("%H:%M:%S")
        })

        contents.append(
            types.Content(
                role="user",
                parts=[
                    types.Part.from_function_response(
                        name=function_name,
                        response={"result": result},
                    )
                ],
            )
        )

    # Return full execution turn to Gemini
    final_response = local_client.models.generate_content(
        model=MODEL,
        contents=contents,
        config=config,
    )

    elapsed = time.time() - start_time
    trace_steps.append({
        "step": len(trace_steps) + 1,
        "type": "final_llm_response",
        "message": final_response.text
    })

    return {
        "answer": final_response.text,
        "tool_calls": executed_tools,
        "trace": trace_steps,
        "total_time_ms": round(elapsed * 1000, 2),
        "model": MODEL
    }


def run_agent(user_message: str) -> str:
    """Send a user message to Gemini and execute requested tools."""
    res = run_agent_with_trace(user_message)
    return res["answer"]


def main():

    print("Gemini Tool Agent")
    print("Type 'exit' or 'quit' to stop.\n")

    while True:
        user_input = input("You: ").strip()

        if user_input.lower() in {"exit", "quit"}:
            print("Bye!")
            break

        if not user_input:
            continue

        try:
            answer = run_agent(user_input)
            print(f"Gemini: {answer}\n")
        except Exception as exc:
            print(f"Error: {exc}\n")


if __name__ == "__main__":
    main()
