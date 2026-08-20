# Gemini 2.5 Flash Tool-Calling Agent

A minimal Python agent that lets Gemini 2.5 Flash decide which Python tools to call based on the user's request.

## Features

- Gemini 2.5 Flash
- Function/tool calling
- Python function registry
- Multiple tools
- Tool result sent back to Gemini
- Simple terminal chat interface

## Project structure

```text
gemini_tool_agent/
├── app.py
├── tools.py
├── requirements.txt
├── .env.example
└── README.md
```

## 1. Create a virtual environment

macOS/Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Windows:

```powershell
python -m venv .venv
.venv\Scripts\activate
```

## 2. Install dependencies

```bash
pip install -r requirements.txt
```

## 3. Add your Gemini API key

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then put your API key into `.env`:

```env
GEMINI_API_KEY=YOUR_API_KEY
```

Do not commit `.env` to Git.

## 4. Run

```bash
python app.py
```

Try:

```text
What is 20 + 30?
```

```text
What is 15 multiplied by 8?
```

```text
What is 100 divided by 4?
```

```text
What is the square of 12?
```

You should see the selected tool printed in the terminal.

## How tool calling works

```text
User
  |
  v
Gemini 2.5 Flash
  |
  | decides which tool is needed
  v
Python tool
  |
  | returns result
  v
Gemini 2.5 Flash
  |
  v
Final response
```

## Adding a new tool

1. Create a normal Python function in `tools.py`.

Example:

```python
def cube(n: float) -> float:
    return n * n * n
```

2. Add a Gemini `FunctionDeclaration`.

3. Add the function to `AVAILABLE_FUNCTIONS`.

The important idea is that Gemini does not execute your Python function directly. Gemini requests a tool call, your Python application executes it, and the result is returned to Gemini.

## Security

Do not expose dangerous functions directly to an LLM, such as unrestricted shell execution or arbitrary code execution.

For real applications, validate arguments, authenticate users, enforce permissions, and restrict what each tool can do.
# RenderHosting1
